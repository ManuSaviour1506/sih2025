import cv2
import mediapipe as mp
import numpy as np
import json
import sys
import tempfile
import requests
import os
import urllib.parse
from datetime import datetime

# --- ImageKit Credentials ---
IK_PRIVATE_KEY = "your_imagekit_private_key"
IK_PUBLIC_KEY = "your_imagekit_public_key"
IK_URL_ENDPOINT = "your_imagekit_url_endpoint"

def upload_to_imagekit(file_path):
    try:
        url = f"https://upload.imagekit.io/api/v1/files/upload"
        headers = {'Authorization': f'Bearer {IK_PRIVATE_KEY}'}
        
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f}, data={
                'fileName': f"vertical_jump_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp4",
                'folder': 'analyzed-videos'
            })
            response.raise_for_status()
            return response.json().get('url')

    except requests.exceptions.RequestException as e:
        print(f"Failed to upload to ImageKit: {e}", file=sys.stderr)
        return None

def analyze_vertical_jump(video_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"error": "Could not open video file."}

    # --- Video Writer Setup ---
    temp_output_video_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    out = cv2.VideoWriter(temp_output_video_path, fourcc, fps, (width, height))

    # --- Analysis Variables ---
    max_jump_height = 0
    start_height = 0
    
    # --- Main Analysis and Rendering Loop ---
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Use hip landmarks for height calculation
            left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            hip_y = (left_hip.y + right_hip.y) / 2
            
            # Set a reference height for the starting position
            if start_height == 0:
                start_height = hip_y
            
            # Calculate current jump height (in relative units)
            jump_height = start_height - hip_y
            
            # Update max jump height
            if jump_height > max_jump_height:
                max_jump_height = jump_height
                
            # --- Draw landmarks and text on the frame ---
            mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            
            # Display the jump height
            cv2.putText(frame, f'Jump: {max_jump_height:.2f} px', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
            
        out.write(frame)
        
    cap.release()
    out.release()
    pose.close()

    # --- Final Score and Upload ---
    # Convert pixels to a more meaningful score if possible (requires calibration)
    # For now, we'll use pixel-based score
    final_score = round(max_jump_height, 2)
    analyzed_video_url = upload_to_imagekit(temp_output_video_path)
    
    if os.path.exists(temp_output_video_path):
        os.remove(temp_output_video_path)

    return {
        "testType": "Vertical Jump",
        "result": { "jump_height_pixels": final_score },
        "score": final_score,
        "analyzedVideoUrl": analyzed_video_url
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        result = analyze_vertical_jump(video_path)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No video path provided"}))