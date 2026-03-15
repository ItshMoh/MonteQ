"""Quick WebSocket test for Phase 4.

Usage: venv/bin/python3 test_ws.py <JWT_TOKEN>
"""
import asyncio
import sys
import websockets


async def main(token: str):
    uri = f"ws://localhost:8000/ws?token={token}"
    print(f"Connecting to {uri}")

    async with websockets.connect(uri) as ws:
        print("Connected! Waiting for events...")
        print("(Open another terminal and hit /deribit/execute or /portfolio/risk)\n")

        # Send a ping to verify connection
        await ws.send("ping")
        pong = await ws.recv()
        print(f"Got: {pong}")

        # Listen for events
        while True:
            msg = await ws.recv()
            print(f"Event: {msg}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: venv/bin/python3 test_ws.py <JWT_TOKEN>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
