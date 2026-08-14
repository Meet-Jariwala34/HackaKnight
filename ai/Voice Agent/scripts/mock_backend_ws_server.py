
import asyncio
import json

import websockets

HOST = "localhost"
PORT = 8765


async def handle_connection(connection):
    print(f"[connected] {connection.remote_address}")
    async for raw_message in connection:
        try:
            message = json.loads(raw_message)
            print(f"[{message.get('event')}] session={message.get('session_id')}")
            print(json.dumps(message.get("data"), indent=2))
        except json.JSONDecodeError:
            print(f"[non-JSON message] {raw_message!r}")
    print(f"[disconnected] {connection.remote_address}")


async def main() -> None:
    async with websockets.serve(handle_connection, HOST, PORT):
        print(f"Mock backend listening on ws://{HOST}:{PORT} — Ctrl+C to stop.")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
