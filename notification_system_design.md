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
