import cv2
import mediapipe as mp
import numpy as np
import json
import sys
import tempfile
import requests
import os
import urllib.parse
import math
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
                'fileName': f"endurance_run_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp4",
                'folder': 'analyzed-videos'
            })
            response.raise_for_status()
            return response.json().get('url')

    except requests.exceptions.RequestException as e:
        print(f"Failed to upload to ImageKit: {e}", file=sys.stderr)
        return None

def analyze_endurance_run(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": "Could not open video file."}

    # --- Analysis Variables ---
    total_distance_pixels = 0
    prev_hip_pos = None

    # --- Video Writer Setup ---
    temp_output_video_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(temp_output_video_path, fourcc, fps, (width, height))
    
    # --- Main Analysis and Rendering Loop ---
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Use a stable landmark like the right hip (landmark 24)
            right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            
            current_hip_pos = (right_hip.x, right_hip.y)
            
            if prev_hip_pos:
                dx = current_hip_pos[0] - prev_hip_pos[0]
                dy = current_hip_pos[1] - prev_hip_pos[1]
                distance = math.sqrt(dx**2 + dy**2)
                total_distance_pixels += distance
            
            prev_hip_pos = current_hip_pos

            # --- Draw landmarks and text on the frame ---
            mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Display the distance covered
            cv2.putText(frame, f'Distance: {total_distance_pixels:.2f} px', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
        
        out.write(frame)
        
    cap.release()
    out.release()
    pose.close()

    # --- Final Score and Upload ---
    final_score = round(total_distance_pixels, 2)
    analyzed_video_url = upload_to_imagekit(temp_output_video_path)
    
    if os.path.exists(temp_output_video_path):
        os.remove(temp_output_video_path)

    return {
        "testType": "Endurance Run",
        "result": { "distance_covered_pixels": final_score },
        "score": final_score,
        "analyzedVideoUrl": analyzed_video_url
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_endurance_run(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))