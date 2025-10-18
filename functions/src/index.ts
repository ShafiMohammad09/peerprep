
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// FIX: Import v2 handlers for firestore and scheduler to align with modern Firebase Functions SDK.
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
// FIX: Corrected import for onSchedule from pubsub to scheduler.
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function triggered when a booking's status is updated.
 * If the status becomes 'waiting_match', this function searches for another
 * user in the same time slot who is also waiting and creates a match.
 */
// FIX: Updated to use Firebase Functions v2 syntax for Firestore triggers.
export const findMatch = onDocumentUpdated("bookings/{bookingId}", async (event) => {
    if (!event.data) {
        return null;
    }
    const bookingDataAfter = event.data.after.data();
    const bookingDataBefore = event.data.before.data();

    if (!bookingDataAfter || !bookingDataBefore) {
        functions.logger.log("Event data is missing for before or after state.");
        return null;
    }

    // Only proceed if status just changed to 'waiting_match'
    if (bookingDataAfter.status !== 'waiting_match' || bookingDataBefore.status === 'waiting_match') {
      return null;
    }

    const { userId, slotTime } = bookingDataAfter;
    const myBookingId = event.params.bookingId;

    functions.logger.log(`Booking ${myBookingId} is waiting. Searching for peer in slot ${slotTime.toDate()}.`);

    const waitingPeersQuery = db.collection('bookings')
      .where('slotTime', '==', slotTime)
      .where('status', '==', 'waiting_match')
      .where('userId', '!=', userId);

    const querySnapshot = await waitingPeersQuery.get();
    
    // Filter out my own document just in case.
    const availablePeers = querySnapshot.docs.filter(doc => doc.id !== myBookingId);

    if (availablePeers.length === 0) {
      functions.logger.log(`No peers available for booking ${myBookingId}.`);
      return null;
    }
    
    const peerBookingDoc = availablePeers[0];
    const peerBookingId = peerBookingDoc.id;

    functions.logger.log(`Attempting to match ${myBookingId} with ${peerBookingId}.`);

    try {
      // Use a transaction to prevent race conditions
      await db.runTransaction(async (transaction) => {
        const myRef = db.collection('bookings').doc(myBookingId);
        const peerRef = db.collection('bookings').doc(peerBookingId);

        const [myDoc, peerDoc] = await transaction.getAll(myRef, peerRef);

        if (!myDoc.exists || myDoc.data()?.status !== 'waiting_match' ||
            !peerDoc.exists || peerDoc.data()?.status !== 'waiting_match') {
          throw new Error('One or both users are no longer waiting for a match.');
        }

        const matchId = db.collection("matches").doc().id;
        const meetLink = `https://meet.google.com/lookup/m-${matchId}`;

        transaction.update(myRef, { status: 'matched', matchId, meetLink });
        transaction.update(peerRef, { status: 'matched', matchId, meetLink });
      });
      functions.logger.log(`Successfully matched ${myBookingId} and ${peerBookingId}.`);
    } catch (error) {
      functions.logger.error(`Match transaction failed for ${myBookingId} and ${peerBookingId}:`, error);
    }

    return null;
  });

/**
 * A scheduled function that runs every 5 minutes to clean up stale bookings.
 * - Handles 'NO_MATCH': Refunds a star to users who were waiting but no match was found.
 * - Handles 'NO_SHOW': Updates status for users who booked a slot but never marked themselves as ready.
 */
// FIX: Updated to use Firebase Functions v2 syntax for scheduled functions.
export const handleTimeouts = onSchedule("every 5 minutes", async (context) => {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    
    // --- Handle NO_MATCH ---
    // A user is 'NO_MATCH' if they are still 'waiting_match' 5 minutes after their slot started.
    const noMatchCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
    const waitingQuery = db.collection("bookings")
        .where("status", "==", "waiting_match")
        .where("slotTime", "<=", noMatchCutoff);
    
    const waitingSnapshot = await waitingQuery.get();
    if (!waitingSnapshot.empty) {
        functions.logger.log(`Found ${waitingSnapshot.size} bookings that timed out waiting for a match.`);
        for (const doc of waitingSnapshot.docs) {
            const bookingRef = doc.ref;
            const userRef = db.collection("users").doc(doc.data().userId);
            
            functions.logger.log(`Setting booking ${doc.id} to NO_MATCH and refunding star.`);
            
            batch.update(bookingRef, { status: "no_match" });
            // Refund the star
            batch.update(userRef, { stars: admin.firestore.FieldValue.increment(1) });
        }
    }

    // --- Handle NO_SHOW ---
    // A user is 'NO_SHOW' if their booking is still 'booked' (not 'ready') 5 minutes after slot started.
    const noShowCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
    const noShowQuery = db.collection("bookings")
        .where("status", "==", "booked")
        .where("slotTime", "<=", noShowCutoff);
    
    const noShowSnapshot = await noShowQuery.get();
    if (!noShowSnapshot.empty) {
        functions.logger.log(`Found ${noShowSnapshot.size} bookings that are NO_SHOW.`);
        noShowSnapshot.docs.forEach(doc => {
            functions.logger.log(`Setting booking ${doc.id} to NO_SHOW.`);
            const bookingRef = doc.ref;
            batch.update(bookingRef, { status: "no_show" });
        });
    }
    
    await batch.commit();
    return null;
});
