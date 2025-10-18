import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Booking, BookingStatus } from '../types';

// --- Helper Functions ---
const generateTimeSlots = (): Date[] => {
  const slots: Date[] = [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < 48; i++) {
    const slotTime = new Date(startOfDay.getTime() + i * 30 * 60 * 1000);
    slots.push(slotTime);
  }
  return slots;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- Sub-components ---

const Header: React.FC = () => {
    const { user, logout } = useAppContext();
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-indigo-600">PeerPrep</h1>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2" aria-label={`You have ${user?.stars} stars`}>
                    <span className="text-yellow-500" aria-hidden="true">⭐</span>
                    <span className="font-semibold">{user?.stars}</span>
                </div>
                <button onClick={logout} className="text-sm font-medium text-slate-600 hover:text-indigo-500">Logout</button>
            </div>
        </header>
    );
};


const SlotList: React.FC = () => {
    const { bookSlot, user, quickMatch } = useAppContext();
    const [timeSlots] = useState<Date[]>(generateTimeSlots());
    const now = new Date();

    const handleBookSlot = async (slot: Date) => {
      try {
        await bookSlot(slot);
      } catch (error) {
        console.error("Failed to book slot:", error);
      }
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-2xl font-bold mb-3">🚀 Quick Test Mode</h3>
                <p className="mb-4 opacity-90">Skip the waiting! Click below to find a partner instantly for testing.</p>
                <button 
                    onClick={quickMatch}
                    disabled={!user || user.stars <= 0}
                    className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-lg hover:bg-indigo-50 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    Find Partner Right Away (1 ⭐)
                </button>
            </div>
            <h2 className="text-2xl font-bold mb-4">Book a Slot</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {timeSlots.map((slot, index) => {
                    const isPast = now > slot;
                    const canBook = user && user.stars > 0 && !isPast;
                    return (
                        <div key={index} className={`p-4 rounded-lg text-center ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-white shadow'}`}>
                            <p className="font-semibold text-lg">{formatTime(slot)}</p>
                            <button
                                onClick={() => handleBookSlot(slot)}
                                disabled={!canBook}
                                className="mt-2 w-full text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-slate-300"
                            >
                                {isPast ? 'Past' : (user && user.stars > 0 ? 'Book' : 'No Stars')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BookingStatusDisplay: React.FC<{ booking: Booking }> = ({ booking }) => {
    const { setReady, clearMatchResult, cancelMatch } = useAppContext();
    const [countdown, setCountdown] = useState('');
    const [showReadyButton, setShowReadyButton] = useState(false);
    const bookingTime = booking.slotTime.toDate(); // Convert Firestore Timestamp to JS Date

    useEffect(() => {
        if (booking.status !== BookingStatus.BOOKED) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const slotTime = bookingTime.getTime();
            const distance = slotTime - now;

            if (distance <= 5 * 60 * 1000 && distance > 0) {
                setShowReadyButton(true);
            } else {
                 setShowReadyButton(false);
            }
            
            if (distance > 0) {
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setCountdown(`${minutes}m ${seconds}s`);
            } else {
                setCountdown('Slot started');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [booking, bookingTime]);

    const renderContent = () => {
        switch (booking.status) {
            case BookingStatus.BOOKED:
                return (
                    <>
                        <p className="text-lg">Your interview is at <span className="font-bold">{formatTime(bookingTime)}</span></p>
                        <p className="text-slate-600 mt-2">Time until slot: {countdown}</p>
                        {showReadyButton && (
                             <button onClick={setReady} className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                Ready to Join
                            </button>
                        )}
                    </>
                );
            case BookingStatus.WAITING_MATCH:
                return (
                    <div className="text-center">
                        <div role="status" className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-4 text-lg font-semibold">Waiting for a match...</p>
                            <p className="text-slate-500">This may take a moment. We're finding a peer for you.</p>
                            <button 
                                onClick={cancelMatch} 
                                className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                            >
                                Cancel & Refund Star
                            </button>
                        </div>
                    </div>
                );
            case BookingStatus.MATCHED:
                return (
                    <div className="text-center">
                         <h3 className="text-2xl font-bold text-green-600">Match Found!</h3>
                         <p className="mt-2 text-slate-600">Here is your Google Meet link to join the interview.</p>
                         <a href={booking.meetLink || '#'} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                            Join Google Meet
                         </a>
                         <button onClick={clearMatchResult} className="mt-4 block mx-auto text-sm text-slate-500 hover:underline">Book another slot</button>
                    </div>
                );
            case BookingStatus.NO_MATCH:
                 return (
                    <div className="text-center">
                         <h3 className="text-2xl font-bold text-orange-500">No Match Found</h3>
                         <p className="mt-2 text-slate-600">Unfortunately, we couldn't find a peer for this slot. Your Star has been refunded.</p>
                         <button onClick={clearMatchResult} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                            Book Another Slot
                         </button>
                    </div>
                );
            case BookingStatus.NO_SHOW:
                return (
                   <div className="text-center">
                        <h3 className="text-2xl font-bold text-red-500">You Missed Your Slot</h3>
                        <p className="mt-2 text-slate-600">You did not confirm your readiness for the interview at {formatTime(bookingTime)}.</p>
                        <button onClick={clearMatchResult} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                           Book Another Slot
                        </button>
                   </div>
               );
            default:
                return null;
        }
    };
    
    return (
        <div className="p-4 sm:p-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8" role="alert" aria-live="assertive">
                {renderContent()}
            </div>
        </div>
    );
};

const ExtraStars: React.FC = () => {
    const { addStars } = useAppContext();
    return (
        <div className="p-4 sm:p-8 bg-slate-100 mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">Need More Stars?</h2>
            <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow text-center">
                    <h3 className="font-semibold text-lg">Watch an Ad</h3>
                    <p className="text-sm text-slate-600 my-2">Watch a short ad to earn one extra star.</p>
                    <button onClick={() => addStars(1)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-5 rounded-lg transition-colors">
                        Watch Ad (+1 ⭐)
                    </button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow text-center">
                    <h3 className="font-semibold text-lg">Refer a Friend</h3>
                    <p className="text-sm text-slate-600 my-2">Share your referral code and get two stars when they sign up.</p>
                     <button onClick={() => alert("Your referral code is: MOCK-123. Share it with friends!")} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-5 rounded-lg transition-colors">
                        Refer (+2 ⭐)
                    </button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
  const { booking } = useAppContext();

  return (
    <div>
        <Header />
        <main>
            {booking ? <BookingStatusDisplay booking={booking}/> : <SlotList />}
            {!booking && <ExtraStars />}
        </main>
    </div>
  );
};

export default Dashboard;
