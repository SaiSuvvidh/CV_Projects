import socket
import json
import cv2
from handDetector import HandDetector

PORT = 5000

def join_game():
    server_ip = input("Enter Host IP:")

    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((server_ip, PORT))
    print("[CLIENT] Connected to host 🎮")

    cap = cv2.VideoCapture(0)
    detector = HandDetector(detectionCon=0.8, maxHands=1)
    game_state = {}

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)

        # Detect client paddle (right side)
        hands, _ = detector.findHands(frame, flipType=False, draw=False)
        if hands:
            y = hands[0]["center"][1]
            msg = json.dumps({"paddle_right": y})
            client.sendall(msg.encode("utf-8"))

        # Receive game state
        try:
            data = client.recv(1024).decode("utf-8")
            if data:
                game_state = json.loads(data)
        except:
            pass

        # Draw game state
        if game_state:
            cv2.circle(frame, tuple(game_state["ball"]), 10, (0, 255, 0), -1)
            cv2.rectangle(frame, (40, game_state["paddle_left"]-50), (60, game_state["paddle_left"]+50), (255,0,0), -1)
            cv2.rectangle(frame, (580, game_state["paddle_right"]-50), (600, game_state["paddle_right"]+50), (0,0,255), -1)

            cv2.putText(frame, f"{game_state['score'][0]} - {game_state['score'][1]}", (250, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)

        cv2.imshow("Client Game 🏓", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
