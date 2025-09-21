import cv2
import mediapipe as mp
import numpy as np
import json
import sys
import tempfile
import requests
import os
import urllib.parse
import time
from datetime import datetime

# --- ImageKit Credentials and Upload Function (Same as above) ---
IK_PRIVATE_KEY = "your_imagekit_private_key"
IK_PUBLIC_KEY = "your_imagekit_public_key"
IK_URL_ENDPOINT = "your_imagekit_url_endpoint"

def upload_to_imagekit(file_path):
    try:
        url = f"https://upload.imagekit.io/api/v1/files/upload"
        headers = {'Authorization': f'Bearer {IK_PRIVATE_KEY}'}
        
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f}, data={
                'fileName': f"shuttle_run_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp4",
                'folder': 'analyzed-videos'
            })
            response.raise_for_status()
            return response.json().get('url')

    except requests.exceptions.RequestException as e:
        print(f"Failed to upload to ImageKit: {e}", file=sys.stderr)
        return None

def analyze_shuttle_run(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": f"Could not open video file: {video_path}"}
        
    start_line_y = 550
    far_line_y = 150
    line_touch_threshold = 25
    
    current_state = "READY"
    lap_counter = 0
    start_time = 0
    final_time = 0
    
    # --- Video Writer Setup ---
    temp_output_video_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(temp_output_video_path, fourcc, fps, (width, height))
    
    # --- Main Analysis and Rendering Loop ---
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        
        # Draw the virtual lines for visualization
        cv2.line(frame, (0, start_line_y), (width, start_line_y), (0, 255, 0), 2)
        cv2.line(frame, (0, far_line_y), (width, far_line_y), (0, 0, 255), 2)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            h, w, _ = frame.shape
            
            right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
            wrist_pos_y = int(right_wrist.y * h)
            
            # State machine logic
            if current_state == "READY" and wrist_pos_y > start_line_y:
                current_state = "RUNNING"
                start_time = time.time()
            
            elif current_state == "RUNNING" and abs(wrist_pos_y - far_line_y) < line_touch_threshold:
                current_state = "RETURNING"
                lap_counter += 1
            
            elif current_state == "RETURNING" and abs(wrist_pos_y - start_line_y) < line_touch_threshold:
                lap_counter += 1
                if lap_counter == 4:
                    final_time = time.time() - start_time
                    current_state = "FINISHED"
                else:
                    current_state = "RUNNING"

            # --- Draw landmarks and text on the frame ---
            mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
        
        # Display analysis information
        cv2.putText(frame, f'Laps: {lap_counter}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
        
        if start_time > 0 and final_time == 0:
            current_time = time.time() - start_time
            cv2.putText(frame, f'Time: {current_time:.2f} s', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
        elif final_time > 0:
            cv2.putText(frame, f'Final Time: {final_time:.2f} s', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)

        out.write(frame)
    
    cap.release()
    out.release()
    pose.close()

    if final_time == 0:
        status = "INCOMPLETE"
        final_score = 0
    else:
        status = "SUCCESS"
        final_score = final_time

    # --- Final Score and Upload ---
    analyzed_video_url = upload_to_imagekit(temp_output_video_path)
    
    if os.path.exists(temp_output_video_path):
        os.remove(temp_output_video_path)

    return {
        "testType": "Shuttle Run",
        "result": {
            "laps_completed": lap_counter,
            "final_time_seconds": final_time,
            "status": status,
        },
        "score": final_score,
        "analyzedVideoUrl": analyzed_video_url
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_shuttle_run(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))