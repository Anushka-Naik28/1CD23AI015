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
    *   The server intercepts the connection, validates the JWT, and extracts the `userId`.
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
