from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.security import decode_access_token
from app.services.ws_manager import ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = None):
    """WebSocket endpoint for real-time trade/signal updates.

    Connect with: ws://localhost:8000/ws?token=<JWT>

    Events pushed to client:
      - trade_opened: new trade executed
      - trade_closed: trade closed (manual or auto)
      - trade_stopped: trade stopped by monitor
      - signal_generated: new signal from engine
      - monitor_check: periodic monitoring update
      - portfolio_update: portfolio metrics changed
    """
    # Authenticate via query param token
    if not token:
        await ws.close(code=4001, reason="Missing token")
        return

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await ws.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await ws.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(user_id, ws)

    try:
        # Keep connection alive — listen for client pings/messages
        while True:
            data = await ws.receive_text()
            # Client can send "ping" to keep alive
            if data == "ping":
                await ws.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(user_id, ws)
