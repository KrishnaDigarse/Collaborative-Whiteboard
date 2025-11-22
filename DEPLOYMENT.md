# Deployment Guide

This guide explains how to deploy the Collaborative Whiteboard to Render.

## Prerequisites
- A [Render](https://render.com) account.
- A GitHub repository connected to Render.

## Steps

1. **Push Changes**
   Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push
   ```

2. **Create Blueprint on Render**
   - Go to your Render Dashboard.
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository.
   - Render will automatically detect `render.yaml`.
   - Click **Apply**.

3. **Verify Deployment**
   - Render will create two services: `whiteboard-backend` and `whiteboard-frontend`.
   - Wait for both to deploy (green checkmark).
   - Open the frontend URL.

## Troubleshooting
- **CORS Errors**: Check the `cors.allowed-origins` environment variable in the backend service. It should match the frontend URL.
- **WebSocket Connection Failed**: Ensure `NEXT_PUBLIC_BACKEND_URL` in the frontend service matches the backend URL.
