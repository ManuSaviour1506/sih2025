import cv2
import mediapipe as mp
import time
import json
import sys

def analyze_sprint(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose()
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        return {"error": f"Could not open video file: {video_path}"}
    
    # Fixed calibration lines
    start_line_x = 100
    finish_line_x = 1200
    
    current_state = "READY"
    start_time = 0
    final_time = 0
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            h, w, _ = frame.shape
            
            right_shoulder_x = int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * w)
            
            if current_state == "READY" and right_shoulder_x > start_line_x:
                current_state = "RUNNING"
                start_time = time.time()
            
            elif current_state == "RUNNING" and right_shoulder_x > finish_line_x:
                final_time = time.time() - start_time
                current_state = "FINISHED"
    
    cap.release()
    pose.close()

    if final_time == 0:
        status = "INCOMPLETE"
        result_str = "N/A"
    else:
        status = "SUCCESS"
        result_str = f"{final_time:.2f} s"

    return {
        "testType": "Sprint",
        "result": result_str,
        "score_seconds": round(final_time, 2),
        "status": status,
        "cheatDetected": False,
        "anomalies": ["Incomplete run"] if status == "INCOMPLETE" else []
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_sprint(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided."}))