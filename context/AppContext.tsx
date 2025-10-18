import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, runTransaction, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { User, Booking, BookingStatus } from '../types';

interface AppContextType {
  user: User | null;
  booking: Booking | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  bookSlot: (slotTime: Date) => Promise<void>;
  setReady: () => Promise<void>;
  addStars: (amount: number) => Promise<void>;
  clearMatchResult: () => Promise<void>;
  cancelMatch: () => Promise<void>;
  quickMatch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          // Create a new user profile in Firestore
          const newUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            stars: 5,
            lastStarRefresh: Timestamp.now(),
            referralCode: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setBooking(null);
      return;
    }

    // Listen for active bookings
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('userId', '==', user.uid),
      where('status', 'in', [
        BookingStatus.BOOKED,
        BookingStatus.WAITING_MATCH,
        BookingStatus.MATCHED,
        BookingStatus.NO_MATCH,
        BookingStatus.NO_SHOW,
      ]),
      limit(1)
    );

    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const bookingDoc = snapshot.docs[0];
        setBooking({ bookingId: bookingDoc.id, ...bookingDoc.data() } as Booking);
      } else {
        setBooking(null);
      }
    });

    return () => unsubscribeBookings();
  }, [user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addStars = async (amount: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        stars: user.stars + amount
      });
      setUser(prevUser => prevUser ? { ...prevUser, stars: prevUser.stars + amount } : null);
    }
  };

  const bookSlot = async (slotTime: Date) => {
    if (!user || user.stars <= 0) {
      alert("You don't have enough stars to book a slot.");
      return;
    }
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || userDoc.data().stars < 1) {
          throw new Error("Insufficient stars!");
        }

        const newStars = userDoc.data().stars - 1;
        transaction.update(userRef, { stars: newStars });

        const newBookingRef = doc(collection(db, 'bookings'));
        transaction.set(newBookingRef, {
          userId: user.uid,
          slotTime: Timestamp.fromDate(slotTime),
          status: BookingStatus.BOOKED,
          timezone: user.timezone,
        });
      });
    } catch (error) {
      console.error("Booking transaction failed: ", error);
      alert("Failed to book slot. Please try again.");
    }
  };

  const setReady = async () => {
    if (!booking || !user) return;
    
    try {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      
      // First, set our status to waiting_match
      await updateDoc(bookingRef, { status: BookingStatus.WAITING_MATCH });
      
      // Then immediately try to find a match
      await runTransaction(db, async (transaction) => {
        // Re-fetch our booking to ensure it's still valid
        const myBookingDoc = await transaction.get(bookingRef);
        if (!myBookingDoc.exists() || myBookingDoc.data()?.status !== BookingStatus.WAITING_MATCH) {
          return; // Already matched or invalid
        }
        
        const myData = myBookingDoc.data();
        
        // Query for ALL users waiting in the same slot (without != operator)
        const waitingPeersQuery = query(
          collection(db, 'bookings'),
          where('slotTime', '==', myData.slotTime),
          where('status', '==', BookingStatus.WAITING_MATCH)
        );
        
        const querySnapshot = await getDocs(waitingPeersQuery);
        
        // Filter out our own booking and users with the same userId
        const availablePeers = querySnapshot.docs.filter(
          d => d.id !== booking.bookingId && d.data().userId !== user.uid
        );
        
        if (availablePeers.length === 0) {
          // No match found yet, stay in waiting state
          console.log("No peers available for matching");
          return;
        }
        
        const peerDoc = availablePeers[0];
        const peerRef = doc(db, 'bookings', peerDoc.id);
        
        // Verify peer is still waiting within the transaction
        const peerSnapshot = await transaction.get(peerRef);
        if (!peerSnapshot.exists() || peerSnapshot.data()?.status !== BookingStatus.WAITING_MATCH) {
          console.log("Peer no longer available");
          return; // Peer no longer available
        }
        
        // Create match
        const matchId = doc(collection(db, 'matches')).id;
        const meetLink = `https://meet.google.com/${matchId}`;
        
        console.log(`Creating match ${matchId} between ${booking.bookingId} and ${peerDoc.id}`);
        
        transaction.update(bookingRef, { 
          status: BookingStatus.MATCHED, 
          matchId, 
          meetLink 
        });
        transaction.update(peerRef, { 
          status: BookingStatus.MATCHED, 
          matchId, 
          meetLink 
        });
      });
    } catch (error) {
      console.error("Error in setReady:", error);
      alert("Failed to find match. Please try again.");
    }
  };

  const clearMatchResult = async () => {
    if (booking) {
      const bookingRef = doc(db, 'bookings', booking.bookingId);
      // Instead of deleting, we update the status to a terminal state.
      // A Cloud Function could later clean these up.
      await updateDoc(bookingRef, { status: BookingStatus.IDLE });
    }
  };

  const cancelMatch = async () => {
    if (!booking || !user) return;

    try {
      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, 'bookings', booking.bookingId);
        const userRef = doc(db, 'users', user.uid);
        
        // Re-read both documents inside the transaction
        const bookingDoc = await transaction.get(bookingRef);
        const userDoc = await transaction.get(userRef);
        
        if (!bookingDoc.exists()) {
          throw new Error("Booking not found");
        }
        
        const bookingData = bookingDoc.data();
        
        // Only allow canceling if still waiting for a match
        if (bookingData?.status !== BookingStatus.WAITING_MATCH) {
          throw new Error("Cannot cancel - booking is no longer waiting for a match");
        }
        
        if (!userDoc.exists()) {
          throw new Error("User not found");
        }
        
        // Get the actual current star count from the database
        const currentStars = userDoc.data()?.stars || 0;
        
        // Refund the star and cancel the booking
        transaction.update(bookingRef, { status: BookingStatus.IDLE });
        transaction.update(userRef, { stars: currentStars + 1 });
      });
      
      console.log("Match cancelled successfully");
    } catch (error: any) {
      console.error("Error cancelling match:", error);
      alert(error.message || "Failed to cancel match. Please try again.");
    }
  };

  const quickMatch = async () => {
    if (!user || user.stars <= 0) {
      alert("You don't have enough stars to find a match.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || userDoc.data().stars < 1) {
          throw new Error("Insufficient stars!");
        }

        const newStars = userDoc.data().stars - 1;
        transaction.update(userRef, { stars: newStars });

        // Create a booking with current time (for testing)
        const now = new Date();
        const newBookingRef = doc(collection(db, 'bookings'));
        transaction.set(newBookingRef, {
          userId: user.uid,
          slotTime: Timestamp.fromDate(now),
          status: BookingStatus.WAITING_MATCH,
          timezone: user.timezone,
        });
      });
    } catch (error) {
      console.error("Quick match transaction failed: ", error);
      alert("Failed to start quick match. Please try again.");
    }
  };

  return (
    <AppContext.Provider value={{ user, booking, loading, login, logout, bookSlot, setReady, addStars, clearMatchResult, cancelMatch, quickMatch }}>
      {!loading && children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};