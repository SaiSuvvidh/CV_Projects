import socket
import threading
import json
import cv2
import numpy as np
from handDetector import HandDetector

HOST = "0.0.0.0"   # Listen on all interfaces
PORT = 5000

# Shared game state
game_state = {"ball": [320, 240], "paddle_left": 240, "paddle_right": 240, "score": [0, 0]}
lock = threading.Lock()

def handle_client(conn):
    global game_state
    while True:
        try:
            data = conn.recv(1024).decode("utf-8")
            if not data:
                break
            msg = json.loads(data)

            # Update client paddle
            with lock:
                game_state["paddle_right"] = msg["paddle_right"]

            # Send updated state
            conn.sendall(json.dumps(game_state).encode("utf-8"))

        except:
            break
    conn.close()

def host_game():
    global game_state
    print(f"[HOST] Hosting game on {HOST}:{PORT}... 🖥️")

    # Setup networking
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen(1)
    print("[HOST] Waiting for a client to join...")

    conn, addr = server.accept()
    print(f"[HOST] Client connected from {addr}")

    threading.Thread(target=handle_client, args=(conn,), daemon=True).start()

    # Setup OpenCV
    cap = cv2.VideoCapture(0)
    detector = HandDetector(detectionCon=0.8, maxHands=1)
    ball_speed = [5, 5]

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)

        # Detect host's paddle (left side)
        hands, _ = detector.findHands(frame, flipType=False, draw=False)
        if hands:
            y = hands[0]["center"][1]
            with lock:
                game_state["paddle_left"] = y

        # Move ball
        with lock:
            game_state["ball"][0] += ball_speed[0]
            game_state["ball"][1] += ball_speed[1]

            # Bounce top/bottom
            if game_state["ball"][1] <= 10 or game_state["ball"][1] >= 470:
                ball_speed[1] = -ball_speed[1]

            # Bounce left paddle
            if 50 < game_state["ball"][0] < 70 and abs(game_state["ball"][1] - game_state["paddle_left"]) < 60:
                ball_speed[0] = -ball_speed[0]
                game_state["score"][0] += 1

            # Bounce right paddle
            if 550 < game_state["ball"][0] < 570 and abs(game_state["ball"][1] - game_state["paddle_right"]) < 60:
                ball_speed[0] = -ball_speed[0]
                game_state["score"][1] += 1

            # Reset if out of bounds
            if game_state["ball"][0] < 0 or game_state["ball"][0] > 640:
                game_state["ball"] = [320, 240]

        # Draw paddles & ball
        cv2.circle(frame, tuple(game_state["ball"]), 10, (0, 255, 0), -1)
        cv2.rectangle(frame, (40, game_state["paddle_left"]-50), (60, game_state["paddle_left"]+50), (255,0,0), -1)
        cv2.rectangle(frame, (580, game_state["paddle_right"]-50), (600, game_state["paddle_right"]+50), (0,0,255), -1)

        # Score
        cv2.putText(frame, f"{game_state['score'][0]} - {game_state['score'][1]}", (250, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)

        cv2.imshow("Host Game 🏓", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
