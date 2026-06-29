/**
 * Affordmed Campus Hiring Evaluation: Stage 6 Priority Inbox Implementation
 * 
 * This service implements the priority inbox sorting logic using type weights
 * and recency, as well as a dynamic Min-Heap simulation for maintaining the top 10
 * notifications efficiently in a streaming environment.
 */

// Define weights for notification types
const TYPE_WEIGHTS = {
  'Placement': 3,
  'Result': 2,
  'Event': 1
};

/**
 * Comparator to sort/rank notifications.
 * Sorts by Type Weight descending (Placement > Result > Event),
 * and secondary sorts by creation time descending (recency).
 */
function compareNotifications(a, b) {
  const weightA = TYPE_WEIGHTS[a.type] || 0;
  const weightB = TYPE_WEIGHTS[b.type] || 0;

  if (weightA !== weightB) {
    return weightB - weightA; // Higher weight first
  }

  // If weights are equal, sort by recency (newest timestamp first)
  return new Date(b.createdAt) - new Date(a.createdAt);
}

/**
 * Finds the top 10 notifications using standard sort (O(N log N)).
 * Useful for initial page loads.
 * 
 * @param {Array} notifications - Array of notification objects
 * @returns {Array} - Top 10 sorted notifications
 */
function getTopTenNotifications(notifications) {
  return [...notifications]
    .sort(compareNotifications)
    .slice(0, 10);
}

/**
 * Min-Heap implementation to maintain the Top 10 notifications dynamically.
 * Under streaming conditions, keeping a Min-Heap of size K=10 allows us to insert 
 * new elements in O(log K) rather than O(N log N).
 */
class TopKMinHeap {
  constructor(k = 10) {
    this.k = k;
    this.heap = [];
  }

  // Returns the comparator result for two elements.
  // Since this is a MIN heap, the root should be the element with the LOWEST priority
  // (i.e., lowest weight, or oldest timestamp if weights are equal).
  // Thus, b is higher priority than a if b has higher weight or b is newer.
  // So the "min" element is the one that would be at the bottom of a sorted list.
  compare(a, b) {
    // We reverse compareNotifications logic so the root is the "weakest" item.
    return -compareNotifications(a, b);
  }

  push(item) {
    if (this.heap.length < this.k) {
      this.heap.push(item);
      this.upHeap(this.heap.length - 1);
    } else if (compareNotifications(item, this.heap[0]) < 0) {
      // The incoming item is of higher priority than the weakest item (heap[0]).
      // Replace the root and push it down.
      this.heap[0] = item;
      this.downHeap(0);
    }
  }

  upHeap(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parent]) < 0) {
        this.swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  downHeap(index) {
    const len = this.heap.length;
    while (index * 2 + 1 < len) {
      let left = index * 2 + 1;
      let right = index * 2 + 2;
      let smallest = index;

      if (this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < len && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== index) {
        this.swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  // Returns the sorted Top-K list (highest priority first)
  getSortedList() {
    return [...this.heap].sort(compareNotifications);
  }
}

// ==================== DEMO / TEST RUNNER ====================

if (require.main === module) {
  // Helper function to create dates relative to now
  const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
  const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

  // Generate 15 Mock Notifications with various types and times
  const mockNotifications = [
    { id: 1, title: 'Exam Registration open', type: 'Event', createdAt: daysAgo(2) },
    { id: 2, title: 'Cognizant Placement Drive', type: 'Placement', createdAt: hoursAgo(5) },
    { id: 3, title: 'Semester Results Published', type: 'Result', createdAt: hoursAgo(10) },
    { id: 4, title: 'Hackathon Alert', type: 'Event', createdAt: minutesAgo(30) },
    { id: 5, title: 'TCS Offer Letters Out', type: 'Placement', createdAt: daysAgo(3) },
    { id: 6, title: 'Sports Day Schedule', type: 'Event', createdAt: daysAgo(4) },
    { id: 7, title: 'Re-evaluation Results', type: 'Result', createdAt: minutesAgo(10) },
    { id: 8, title: 'Adobe Interview Shortlist', type: 'Placement', createdAt: minutesAgo(5) },
    { id: 9, title: 'Guest Lecture on AI', type: 'Event', createdAt: hoursAgo(2) },
    { id: 10, title: 'Supplementary Exams Results', type: 'Result', createdAt: daysAgo(1) },
    { id: 11, title: 'Workshop on Cloud Computing', type: 'Event', createdAt: hoursAgo(1) },
    { id: 12, title: 'Google Off-Campus Hiring', type: 'Placement', createdAt: hoursAgo(24) },
    { id: 13, title: 'Quiz Competition', type: 'Event', createdAt: minutesAgo(45) },
    { id: 14, title: 'Placement Training Notice', type: 'Placement', createdAt: hoursAgo(12) },
    { id: 15, title: 'Mid-term Results out', type: 'Result', createdAt: hoursAgo(6) }
  ];

  console.log('=== STAGE 6: PRIORITY INBOX TESTING ===\n');
  console.log(`Loaded ${mockNotifications.length} mock notifications...`);

  // Fetch Top 10 notifications using sorting strategy
  const top10 = getTopTenNotifications(mockNotifications);
  console.log('\n--- TOP 10 NOTIFICATIONS (SORTED BY PRIORITY) ---');
  console.table(
    top10.map((n, index) => ({
      Rank: index + 1,
      ID: n.id,
      Title: n.title,
      Type: n.type,
      Recency: new Date(n.createdAt).toLocaleString()
    }))
  );

  // Demonstrate Streaming Heap Optimization
  console.log('\n--- STREAMING DEMONSTRATION (HEAP INGESTION) ---');
  console.log('Initializing Heap size K = 10 and loading notifications...');
  const heap = new TopKMinHeap(10);
  mockNotifications.forEach(n => heap.push(n));

  console.log('Current Heap Top 10:');
  console.table(
    heap.getSortedList().map((n, idx) => ({
      Rank: idx + 1,
      Title: n.title,
      Type: n.type
    }))
  );

  // New incoming notification arrives (High Priority)
  const newCriticalNotification = {
    id: 100,
    title: '[NEW] Microsoft Placement Drive!',
    type: 'Placement',
    createdAt: new Date().toISOString()
  };

  console.log(`\nNew Notification Arrived: "${newCriticalNotification.title}" (${newCriticalNotification.type})`);
  console.log('Inserting into heap...');
  heap.push(newCriticalNotification);

  console.log('\nUpdated Heap Top 10 (Notice eviction of lowest-priority item):');
  console.table(
    heap.getSortedList().map((n, idx) => ({
      Rank: idx + 1,
      Title: n.title,
      Type: n.type,
      Recency: new Date(n.createdAt).toLocaleTimeString()
    }))
  );
}

module.exports = { compareNotifications, getTopTenNotifications, TopKMinHeap };
