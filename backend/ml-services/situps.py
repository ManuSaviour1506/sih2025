import cv2
import mediapipe as mp
import numpy as np
import json
import sys

# Helper function to calculate angle between three points
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

def analyze_situps(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    count = 0
    is_up = False
    cheat_detected = False
    anomalies = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Keypoints for sit-up analysis (using left side for consistency)
            hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP].y]
            shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
            knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE].y]
            ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE].y]
            elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW].y]
            
            # Torso angle to count reps
            torso_angle = calculate_angle(shoulder, hip, knee)
            
            # Cheat Detection: Foot lift from the ground
            if abs(ankle[1] - hip[1]) > 0.1:
                if "Foot lift" not in anomalies:
                    anomalies.append("Foot lift detected.")
                cheat_detected = True

            # Cheat Detection: Hands pulling on head (elbows too close to head)
            if abs(elbow[0] - shoulder[0]) < 0.05:
                if "Hands pulling on head" not in anomalies:
                    anomalies.append("Hands pulling on head detected.")
                cheat_detected = True

            # Rep counting logic
            if torso_angle < 100 and not is_up:
                is_up = True
            elif torso_angle > 160 and is_up:
                count += 1
                is_up = False
    
    cap.release()
    pose.close()

    return {
        "testType": "Sit Ups",
        "count": count,
        "cheatDetected": cheat_detected,
        "anomalies": anomalies
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_situps(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))