# Affordmed Campus Hiring Evaluation: Notification System Design

## Stage 1: REST API Contract & Real-time Notification Design

### 1. Core Actions of the Notification Platform
A robust notification platform must support the following client-facing and server-facing actions:
*   **Fetch User Notifications (Read/Unread/All):** Allows the front-end client to retrieve a list of notifications for the currently authenticated user.
*   **Mark Notification(s) as Read:** Updates the status of a specific notification or all notifications to "read".
*   **Delete/Archive Notification:** Allows users to clear notifications from their notification tray.
*   **Manage Notification Preferences:** Fetches and updates user configurations for notification delivery channels (e.g., In-App, Email, Push).
*   **Real-time Event Delivery:** Pushes notifications instantly to the front-end client when the user is actively logged in.

---

### 2. REST API Endpoints & Contracts

All endpoints are prefixed with `/api` and expect the client to include the authentication token in the request headers:

#### **Common Headers**
```http
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json
Content-Type: application/json
```

---

#### **A. Fetch User Notifications**
Retrieves a paginated list of notifications for the logged-in user.

*   **URL:** `/api/notifications`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `page` (number, default: `1`): The current page number.
    *   `limit` (number, default: `10`): Number of items per page.
    *   `status` (string, optional: `read` | `unread` | `all`, default: `all`): Filter notifications by status.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "notifications": [
          {
            "id": "notif_8f9c0d2e-4b6a-4c8d-9e1f-7b8a9c0d2e1f",
            "title": "Security Alert",
            "message": "A login was detected from a new device.",
            "type": "security",
            "status": "unread",
            "createdAt": "2026-06-29T11:40:00.000Z",
            "readAt": null
          },
          {
            "id": "notif_3a2b1c0d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
            "title": "Welcome to Affordmed!",
            "message": "Your registration was successful.",
            "type": "info",
            "status": "read",
            "createdAt": "2026-06-29T11:00:00.000Z",
            "readAt": "2026-06-29T11:05:00.000Z"
          }
        ],
        "pagination": {
          "currentPage": 1,
          "totalPages": 3,
          "totalItems": 28,
          "limit": 10,
          "hasNextPage": true,
          "hasPrevPage": false
        }
      }
    }
    ```

---

#### **B. Mark Notification as Read**
Updates the status of a specific notification to `read`.

*   **URL:** `/api/notifications/:id/read`
*   **Method:** `PATCH`
*   **URL Parameters:**
    *   `id` (string, required): The ID of the notification.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Notification marked as read.",
      "data": {
        "id": "notif_8f9c0d2e-4b6a-4c8d-9e1f-7b8a9c0d2e1f",
        "status": "read",
        "readAt": "2026-06-29T11:41:20.000Z"
      }
    }
    ```
*   **Response (404 Not Found):**
    ```json
    {
      "success": false,
      "message": "Notification not found or access denied."
    }
    ```

---

#### **C. Bulk Mark All Notifications as Read**
Marks all unread notifications belonging to the logged-in user as `read`.

*   **URL:** `/api/notifications/read-all`
*   **Method:** `POST`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "All notifications marked as read.",
      "data": {
        "modifiedCount": 5
      }
    }
    ```

---

#### **D. Delete a Notification**
Removes a specific notification from the user's account.

*   **URL:** `/api/notifications/:id`
*   **Method:** `DELETE`
*   **URL Parameters:**
    *   `id` (string, required): The ID of the notification.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Notification deleted successfully."
    }
    ```

---

#### **E. Get Notification Preferences**
Retrieves the user's settings for notification channels.

*   **URL:** `/api/notifications/preferences`
*   **Method:** `GET`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "userId": "user_12345",
        "channels": {
          "inApp": true,
          "email": true,
          "push": false
        },
        "updatedAt": "2026-06-29T10:15:30.000Z"
      }
    }
    ```

---

#### **F. Update Notification Preferences**
Updates the delivery preference for the authenticated user.

*   **URL:** `/api/notifications/preferences`
*   **Method:** `PUT`
*   **Request Body:**
    ```json
    {
      "channels": {
        "inApp": true,
        "email": false,
        "push": true
      }
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Preferences updated successfully.",
      "data": {
        "userId": "user_12345",
        "channels": {
          "inApp": true,
          "email": false,
          "push": true
        },
        "updatedAt": "2026-06-29T11:42:00.000Z"
      }
    }
    ```

---

### 3. Real-Time Notification Delivery Mechanism

To deliver notifications instantly to online users, we will use **WebSockets** (specifically utilizing the `socket.io` library). WebSockets establish a full-duplex persistent connection over a single TCP connection, which avoids the overhead of HTTP polling.

#### **Real-Time Flow & Architecture**
1.  **Handshake & Authentication:** 
    *   When the front-end client connects, it must pass the `ACCESS_TOKEN` as part of the handshake query parameters or headers:
        ```javascript
        const socket = io("http://localhost:3000", {
          auth: { token: "Bearer ACCESS_TOKEN" }
        });
        ```
    *   `token` will be decoded at server middleware layer, identifying the `userId`.
2.  **Room Joining:**
    *   Upon successful authentication, the server adds the socket to a private room specific to the user (`user_room_<userId>`). This allows targeting a specific user across multiple active tabs/devices.
3.  **Pushing Events:**
    *   When a notification event is triggered in the backend (e.g., transactional logic, security alert), the server emits a `notification` event only to that user's room:
        ```javascript
        io.to(`user_room_${userId}`).emit('notification', newNotificationPayload);
        ```
4.  **Graceful Fallbacks:**
    *   If WebSockets connection fails, `socket.io` automatically falls back to **HTTP Long Polling**.
    *   If the user is offline, notifications are stored in the database. When they log back in, the client calls `GET /api/notifications` to fetch the cached history.

---

## Stage 2: Database Schema & Query Optimization

### 1. Database Selection: MongoDB (NoSQL)
For a notification engine, a document-based NoSQL database like **MongoDB** is highly recommended over relational databases.

#### **Rationale for Choosing MongoDB**
*   **Flexible Schema (Polymorphism):** Notifications are structurally dynamic. An in-app transactional notification might only have text, whereas an e-commerce or alert notification might contain deep links, images, or action buttons. Storing this using JSON-like documents avoids massive empty columns or complex joins.
*   **High Write Performance:** Notifications are write-heavy. MongoDB's append-only write model and in-memory engine support extremely fast inserts.
*   **Scalability & Sharding:** MongoDB can be horizontally scaled (sharded) by partitioning collections across clusters using the `userId` as the shard key.
*   **Native TTL Indexes:** MongoDB can automatically clean up old read notifications using a Time-To-Live (TTL) index, saving massive storage costs automatically.

---

### 2. Database Schema (NoSQL / MongoDB)

We will define two collections: `notifications` and `notification_preferences`.

#### **A. `notifications` Collection**
Stores individual notification items sent to users.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Indexed)",
  "title": "String",
  "message": "String",
  "type": "String (e.g., 'security', 'info', 'alert')",
  "status": "String (enum: ['unread', 'read'], default: 'unread', Indexed)",
  "createdAt": "Date (default: Date.now, Indexed)",
  "readAt": "Date (nullable)",
  "deletedAt": "Date (nullable, Indexed, for soft delete)"
}
```

#### **B. `notification_preferences` Collection**
Stores user settings for notification channel delivery.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Unique, Indexed)",
  "channels": {
    "inApp": "Boolean (default: true)",
    "email": "Boolean (default: true)",
    "push": "Boolean (default: false)"
  },
  "updatedAt": "Date (default: Date.now)"
}
```

---

### 3. Scaling Challenges & Solutions

As database volume grows to millions of rows, the following issues could arise:

| Problem | Explanation | Solution |
| :--- | :--- | :--- |
| **Slow Query Execution** | Scanning millions of documents to fetch a single user's unread notifications leads to high CPU usage and slow responses. | **Compound Indexing:** Add a compound index on `{ userId: 1, status: 1, createdAt: -1 }`. This allows MongoDB to serve requests instantly from memory. |
| **Storage Bloat** | Storing years of notifications drains server storage and increases backup sizes. | **TTL Indexing & Archival:** Create a Time-to-Live (TTL) index on `createdAt` to automatically delete notifications older than 30 days. Archive older data to an S3-based data lake if historical data is needed. |
| **High Write Contention** | Simultaneous system-wide events (e.g., promotional campaigns) create write bottlenecks on the database. | **Queueing & Sharding:** Push notifications to a Message Queue (like Redis or RabbitMQ) first, allowing background workers to persist writes at a throttled rate. Shard the MongoDB collection by `userId`. |

---

### 4. NoSQL Queries (MongoDB / Mongoose Syntax)

Below are the MongoDB queries corresponding to each Stage 1 API endpoint:

#### **A. Fetch User Notifications (Paginated & Filtered)**
*   *API Request:* `GET /api/notifications?page=1&limit=10&status=unread`
*   *MongoDB Query:*
    ```javascript
    db.notifications.find({
      userId: ObjectId("60d5ec49f323a2a4b80b432a"),
      status: "unread",
      deletedAt: null
    })
    .sort({ createdAt: -1 })
    .skip(0) // (page - 1) * limit
    .limit(10);
    ```

#### **B. Mark Notification as Read**
*   *API Request:* `PATCH /api/notifications/60d5ec58f323a2a4b80b432b/read`
*   *MongoDB Query:*
    ```javascript
    db.notifications.updateOne(
      { 
        _id: ObjectId("60d5ec58f323a2a4b80b432b"),
        userId: ObjectId("60d5ec49f323a2a4b80b432a") // Security check to ensure owner
      },
      { 
        $set: { 
          status: "read",
          readAt: new Date()
        } 
      }
    );
    ```

#### **C. Bulk Mark All as Read**
*   *API Request:* `POST /api/notifications/read-all`
*   *MongoDB Query:*
    ```javascript
    db.notifications.updateMany(
      { 
        userId: ObjectId("60d5ec49f323a2a4b80b432a"),
        status: "unread",
        deletedAt: null
      },
      { 
        $set: { 
          status: "read",
          readAt: new Date()
        } 
      }
    );
    ```

#### **D. Delete a Notification (Soft Delete)**
*   *API Request:* `DELETE /api/notifications/60d5ec58f323a2a4b80b432b`
*   *MongoDB Query:*
    ```javascript
    db.notifications.updateOne(
      { 
        _id: ObjectId("60d5ec58f323a2a4b80b432b"),
        userId: ObjectId("60d5ec49f323a2a4b80b432a")
      },
      { 
        $set: { 
          deletedAt: new Date() 
        } 
      }
    );
    ```

#### **E. Get Notification Preferences**
*   *API Request:* `GET /api/notifications/preferences`
*   *MongoDB Query:*
    ```javascript
    db.notification_preferences.findOne({
      userId: ObjectId("60d5ec49f323a2a4b80b432a")
    });
    ```

#### **F. Update Notification Preferences (Upsert)**
*   *API Request:* `PUT /api/notifications/preferences`
*   *MongoDB Query:*
    ```javascript
    db.notification_preferences.updateOne(
      { userId: ObjectId("60d5ec49f323a2a4b80b432a") },
      { 
        $set: { 
          channels: { inApp: true, email: false, push: true },
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    ```

---

## Stage 3: Relational DB Query Analysis & SQL Optimization

### 1. Analysis of the Relational Query
The query under evaluation is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### **A. Is this query accurate?**
**Yes.** Syntactically and logically, the query is correct. It successfully fetches all unread (`isRead = false`) notifications for the student with ID `1042` and sorts them in ascending chronological order of creation.

#### **B. Why is this query slow?**
At a data scale of **5,000,000 notifications**:
1.  **Full Table Scan (Sequential Scan):** Without an index on `studentID` or `isRead`, the relational database engine cannot perform a targeted lookup. Instead, it must read all 5,000,000 rows from disk into memory to evaluate which rows match `studentID = 1042` and `isRead = false`.
2.  **In-Memory Sorting (Filesort):** Because the query requests `ORDER BY createdAt ASC` on unindexed data, the database engine must fetch all matching records, load them into a temporary buffer (in-memory or on-disk), and perform a sort operation, incurring heavy CPU utilization.

---

### 2. Suggested Optimization & Computational Cost

#### **A. The Solution: Compound Index**
We should create a **Compound Index** on the combination of columns:
```sql
CREATE INDEX idx_student_unread_created ON notifications (studentID, isRead, createdAt);
```

*   **Why this specific order?**
    It adheres to the **ESR (Equality, Sort, Range)** indexing principle:
    1.  `studentID` (Equality) - First column filters by exact student ID.
    2.  `isRead` (Equality) - Second column filters by exact boolean status.
    3.  `createdAt` (Sort) - Storing these in sorted order within the index allows the DB to bypass the sort computation step completely.

#### **B. Computation Cost Comparison**

| Metric | Before Indexing (Full Table Scan) | After Compound Index |
| :--- | :--- | :--- |
| **Search Complexity** | **O(N)** where $N = 5,000,000$. The database performs a sequential scan of all records. | **O(log N + K)** where $\log N$ represents the B-Tree height search (typically 3-4 disk seek operations) and $K$ is the number of matching records. |
| **Sort Complexity** | **O(M log M)** where $M$ is the number of notifications matching `studentID = 1042`. It requires a sorting step. | **O(1)** (Negligible). The database scans the B-Tree index leaf nodes, which are already stored in sorted order. |

---

### 3. Evaluating "Index Every Column" Advice
The teammate’s advice to "add indexes on every column to be safe" is **highly ineffective and dangerous** in production.

#### **Why/Why not?**
*   **Write Penalty:** Every write operation (`INSERT`, `UPDATE`, `DELETE`) requires the database to update the corresponding index structures. Having too many indexes turns simple insert operations into sluggish, resource-heavy operations.
*   **Storage & Memory Bloat:** Indexes must fit into the database cache (RAM) to be effective. Indexing every column bloats memory usage, which pushes pages out of RAM and causes heavy disk I/O (paging/thrashing), degrading overall read speed.
*   **Optimizer Confusion:** Query planners evaluate which index to use. Having multiple single-column indexes can confuse the optimizer, causing it to merge indexes inefficiently rather than selecting the best single compound index.

---

### 4. Query: Placement Notifications in the Last 7 Days
To find all distinct students who received a `"Placement"` notification in the last 7 days:

#### **MySQL Dialect:**
```sql
SELECT DISTINCT studentID 
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

#### **PostgreSQL Dialect:**
```sql
SELECT DISTINCT studentID 
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Read Performance Optimization & Trade-Offs

When 50,000 active students fetch their notifications on *every single page load*, the database is subjected to massive, repetitive read spikes. This wastes computational resources and degrades response latency.

Here are the four primary strategies to mitigate database read fatigue along with their architectural trade-offs:

### 1. In-Memory Caching (e.g., Redis)
Instead of querying the database directly, we intercept read requests with an in-memory cache layer.

*   **Implementation:** Store the user's recent notifications and unread counts in Redis under a key structure like `user:notif:<userId>`. 
    *   **On Read:** Query Redis first. On hit, return immediately. On miss, read from the database and populate Redis.
    *   **On Write:** When a new notification is generated, or when a user marks one as read, update/invalidate the specific cache key.
*   **Trade-Offs:**
    *   **Pros:** Sub-millisecond latency (RAM access speed); completely offloads read traffic from the primary database.
    *   **Cons:** Cache invalidation complexity (risk of users seeing stale unread counts if a write event fails to clear the cache); increased cost to maintain a Redis server cluster.

---

### 2. Live State Push (WebSockets / SSE)
Convert the client behavior from active pulling (REST fetches on load) to server-initiated pushing.

*   **Implementation:** The client calls the REST API *once* when logging into the application, saving notifications in local memory state (e.g., Redux or React Context). For the rest of the session, the database is never queried for reads. Instead, the backend pushes new notifications over WebSockets/SSE directly to online clients.
*   **Trade-Offs:**
    *   **Pros:** Completely eliminates database query repetition during active browsing; delivers instant, premium real-time user experience.
    *   **Cons:** Heavy server memory usage to keep thousands of TCP connection channels open simultaneously; complex reconnect handling when networks fluctuate.

---

### 3. HTTP Conditional Request Validation (`ETag` / `Last-Modified`)
Implement cache validation using HTTP headers.

*   **Implementation:** The server attaches an `ETag` (a hash of the user's notification list) to the response header. On the next page load, the browser calls `/api/notifications` but adds the `If-None-Match` header. If the hash hasn't changed, the server instantly responds with a `304 Not Modified` status code without sending the data payload.
*   **Trade-Offs:**
    *   **Pros:** Saves massive network bandwidth and minimizes JSON serialization overhead; natively supported by web browsers.
    *   **Cons:** The server must still receive and process the request. Unless a fast lookup mechanism (like a cache check) is used, the server might still hit the database to compute the latest ETag.

---

### 4. Throttled Client Fetching (Stale-While-Revalidate)
Throttle client API calls directly on the front-end application layer.

*   **Implementation:** Instead of calling `/api/notifications` immediately on every page refresh or component mount, implement a client-side caching library (like SWR or React Query) with a defined `staleTime` (e.g., 2 minutes). The browser displays cached notifications immediately and only triggers a network request if the data is older than the stale duration.
*   **Trade-Offs:**
    *   **Pros:** Extremely simple to implement; requires zero changes to server infrastructure or database systems.
    *   **Cons:** Notification delivery is delayed by the stale window (users might not see a new alert for up to 2 minutes unless they manually refresh or trigger an event).

---

### Summary Matrix

| Strategy | DB Relief | Latency Improvement | System Complexity | Trade-off / Main Catch |
| :--- | :--- | :--- | :--- | :--- |
| **1. Redis Caching** | High | Excellent (< 1ms) | Medium | Cache validation logic & database synchronization. |
| **2. Real-Time Push** | High | Excellent (Instant) | High | High server RAM requirements for open socket connections. |
| **3. HTTP Conditional** | Low | Medium | Low | Server still receives request; only saves network bandwith. |
| **4. Client Throttling** | Medium | Good (Instant load) | Low | Alerts can be delayed (stale data shown temporarily). |

---

## Stage 5: Mass Dispatch System Design

### 1. Critique & Shortcomings of the Synchronous Code
The proposed implementation of `notify_all` is as follows:
```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # WebSocket push
```

At a scale of **50,000 students**, the following issues will manifest:

1.  **Blockages & Timeouts (High Latency):** 
    Each iteration in the loop performs synchronous actions. If a single student takes `300ms` (network call to Email API + DB insert + socket write), the entire loop takes `50,000 * 0.3s = 15,000 seconds (4.16 hours)`. The calling HTTP thread will timeout and crash long before finishing, leaving the client in a broken state.
2.  **Lack of Resiliency (The "200 Failed mid-way" Scenario):** 
    If `send_email` fails for 200 students midway, the script throws an error and stops execution, leaving the state split. Some students got the email, some didn't. Re-running the script will send duplicate emails to everyone who already received them. There is no trace of which student failed and who succeeded.
3.  **Database Connection Exhaustion:** 
    Running 50,000 sequential inserts puts continuous write locking strain on the DB, slowing down read operations for all other online students.
4.  **API Rate Limiting:** 
    Third-party email dispatch providers (e.g. AWS SES, SendGrid) enforce rate limits. Sending 50,000 unthrottled sequential HTTP calls will trigger a rate-limit error (e.g., `429 Too Many Requests`) or cause IP blocking.

---

### 2. Transaction Decoupling: Should DB Inserts and Email Dispatch Happen Together?
**No. They must be decoupled.**

*   **Why they should not happen together:**
    1.  **Fault Isolation:** The core application feature is the in-app notification. If the external Email Service provider is down, it should *never* prevent the system from registering the notification in the database and pushing it to the student's dashboard.
    2.  **Speed Difference:** Database writes take microseconds; HTTP mail requests take hundreds of milliseconds. Tying them together degrades the entire application performance to the speed of the mail server.
*   **The Decoupling Design:**
    Write to the database and emit the WebSocket push immediately (critical path, fast). Push the email job to an asynchronous queue (non-critical path, slow).

---

### 3. Redesigned Queue-Based Pseudocode (Reliable & Fast)

To achieve fault-tolerance and scale, we partition the job into **Producer** and **Consumer** models:

#### **Producer Code (Web Server Node)**
```python
# HR triggers "Notify All"
function handle_notify_all_request(student_ids: array, message: string):
    # 1. Bulk Insert notifications to DB in a single bulk operation
    notifications_data = []
    for student_id in student_ids:
        notifications_data.append({
            "student_id": student_id,
            "message": message,
            "status": "unread",
            "createdAt": current_timestamp()
        })
    bulk_insert_to_db(notifications_data)  # Done in 1 query (~100ms)

    # 2. Enqueue a single parent dispatch job into Redis Queue
    queue_broker.push("mass_dispatch_job", {
        "student_ids": student_ids,
        "message": message
    })

    # 3. Respond instantly to HR client (No blocking!)
    return HTTP_202_ACCEPTED({"message": "Mass notification queued successfully."})
```

#### **Consumer/Worker Code (Background Workers)**
```python
# Worker picks up the parent job and chunks it
function process_mass_dispatch_job(job):
    student_ids = job.data.student_ids
    message = job.data.message
    
    # Split into batches of 100 to process in parallel
    batches = chunk_array(student_ids, size=100)
    for batch in batches:
        # Create individual task for each student within the batch
        tasks = []
        for student_id in batch:
            tasks.append({
                "student_id": student_id,
                "message": message,
                "retry_count": 0
            })
        
        # Enqueue individual student notification tasks to 'delivery_queue'
        delivery_queue.push_bulk(tasks)

# Worker consumer for individual delivery tasks
function process_delivery_task(task):
    student_id = task.data.student_id
    message = task.data.message
    
    try:
        # 1. Dispatch Email (external API call)
        send_email(student_id, message)
        
        # 2. Push WebSocket notification if student is currently online
        push_to_websocket_room(f"user_room_{student_id}", {
            "message": message,
            "createdAt": current_timestamp()
        })
    except EmailAPIError as e:
        # Fault Tolerance: If email fails for this student, retry up to 3 times
        if task.data.retry_count < 3:
            task.data.retry_count += 1
            # Requeue with Exponential Backoff
            delivery_queue.push_delayed(task, delay=2 ** task.data.retry_count)
        else:
            # Move to Dead Letter Queue for HR reporting
            dead_letter_queue.push(task, error=str(e))
```

---

## Stage 6: Priority Inbox Implementation

### 1. The Priority Algorithm & Sorting Model
To display the top `n` most important unread notifications, we rank them based on a combination of **weight** and **recency**.

*   **Type Weights:**
    *   `Placement` = Weight 3 (highest)
    *   `Result` = Weight 2
    *   `Event` = Weight 1

*   **Hierarchical Sorting Rationale:**
    To ensure critical notices are never buried under generic events, we apply a strict hierarchical sorting strategy:
    1.  **Primary Sort:** Sort by Type Weight descending (`Placement` > `Result` > `Event`).
    2.  **Secondary Sort:** Sort by Timestamp descending (recency).
    This guarantees that all unread placement notices are shown first (ordered newest to oldest), followed by results, and finally events.

---

### 2. Scalability: Efficient Top-10 Maintenance at Scale
If the database receives a constant influx of notifications, reloading all notifications from the database and sorting them is an $O(N \log N)$ operation that will fail at scale.

To maintain the **Top-10** dynamically and efficiently:
*   **The Min-Heap Strategy:**
    We maintain a **Min-Heap (Priority Queue)** of size $K = 10$ in the application memory (or in a fast cache layer like Redis Sorted Sets).
    *   The root of the Min-Heap always represents the *lowest priority* notification in the current top-10 list.
    *   **When a new notification arrives:**
        1. Compare its priority with the root of the heap.
        2. If its priority is higher than the root, pop the root and push the new notification.
        3. Re-balance the heap.
    *   **Time Complexity:** Maintains the top-10 in **$O(\log K)$** time (constant time of $\approx 3$ operations since $K = 10$) instead of re-sorting all $N$ elements, which would take $O(N \log N)$ time.
