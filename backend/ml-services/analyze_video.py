import sys
import json
import os
import subprocess
import requests
import tempfile
import urllib.parse
import traceback

def is_url(path):
    """Checks if the given string is a valid URL."""
    try:
        result = urllib.parse.urlparse(path)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False

def download_video(video_url):
    """Downloads a video from a URL to a temporary file."""
    try:
        print(f"Attempting to download video from URL: {video_url}", file=sys.stderr)
        response = requests.get(video_url, stream=True)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Use tempfile to create a temporary video file
        temp_video = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        for chunk in response.iter_content(chunk_size=8192):
            temp_video.write(chunk)
        temp_video.close()
        print(f"Video downloaded to temporary file: {temp_video.name}", file=sys.stderr)
        return temp_video.name
    except Exception as e:
        raise RuntimeError(f"Failed to download video from URL: {e}")

def dispatch_analysis(video_path, test_type):
    """Dispatches the analysis to the correct sub-script."""
    test_scripts = {
        'Sit Ups': 'situps.py',
        'Vertical Jump': 'verticaljump.py',
        'Shuttle Run': 'shuttlerun.py',
        'Endurance Run': 'endurancerun.py'
    }

    script_name = test_scripts.get(test_type)
    if not script_name:
        return {"error": f"Invalid test type: {test_type}."}

    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    try:
        # Call the specific test script as a subprocess
        print(f"Dispatching analysis to: {script_path} for video: {video_path}", file=sys.stderr)
        process = subprocess.run(
            ['python', script_path, video_path],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Subprocess stdout: {process.stdout}", file=sys.stderr)
        print(f"Subprocess stderr: {process.stderr}", file=sys.stderr)
        return json.loads(process.stdout)
    except subprocess.CalledProcessError as e:
        return {"error": f"Analysis script failed with exit code {e.returncode}: {e.stderr}"}
    except json.JSONDecodeError:
        return {"error": f"Invalid JSON output from script: {process.stdout}"}

if __name__ == "__main__":
    if len(sys.argv) > 2:
        input_path = sys.argv[1]
        test_type = sys.argv[2]
        
        video_path = None
        is_temp_file = False
        
        try:
            if is_url(input_path):
                # Download the video if the input is a URL
                video_path = download_video(input_path)
                is_temp_file = True
            else:
                # If it's not a URL, assume it's a local file path
                video_path = input_path
            
            # Pass the local file path to the dispatcher
            result = dispatch_analysis(video_path, test_type)
            print(json.dumps(result))

        except RuntimeError as e:
            print(json.dumps({"error": str(e)}))
        except Exception as e:
            print(json.dumps({"error": f"An unexpected error occurred: {traceback.format_exc()}"}))
        finally:
            # Clean up the temporary file after analysis
            if is_temp_file and video_path and os.path.exists(video_path):
                try:
                    os.remove(video_path)
                    print(f"Cleaned up temporary file: {video_path}", file=sys.stderr)
                except OSError as e:
                    print(f"Error removing temporary file: {e}", file=sys.stderr)
    else:
        print(json.dumps({"error": "No video path or test type provided."}))