import cv2
import mediapipe as mp
import numpy as np

def analyze_vertical_jump(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    standing_reach_y = None
    jump_peak_y = 1.0  # Normalized Y-coordinate
    cheat_detected = False
    anomalies = []

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Get wrist landmarks
            right_wrist_y = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y
            left_wrist_y = landmarks[mp_pose.PoseLandmark.LEFT_WRIST].y
            current_y = min(right_wrist_y, left_wrist_y)

            # Use the first few frames to find the standing reach
            if frame_count < 30 and standing_reach_y is None:
                standing_reach_y = current_y
            
            # Track the highest point reached during the jump
            jump_peak_y = min(jump_peak_y, current_y)

            # Cheat Detection: Check for early squatting
            right_knee_y = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE].y
            right_hip_y = landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y
            if right_knee_y < right_hip_y - 0.1: # Threshold for a deep squat
                cheat_detected = True
                if "Early squat" not in anomalies:
                    anomalies.append("Early squat detected.")
    
    cap.release()
    pose.close()

    jump_height_cm = 0
    if standing_reach_y is not None:
        jump_height_normalized = standing_reach_y - jump_peak_y
        frame_height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        # Using a fixed pixel-to-cm ratio, which is a key assumption
        # A more advanced model would use a reference object in the frame
        pixel_to_cm_ratio = 0.0264583 # A common conversion rate
        jump_height_cm = jump_height_normalized * frame_height * pixel_to_cm_ratio

    return {
        "testType": "Vertical Jump",
        "result": f"{jump_height_cm:.2f} cm",
        "cheatDetected": cheat_detected,
        "anomalies": anomalies
    }

if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_vertical_jump(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))