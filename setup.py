#!/usr/bin/env python3
"""
Setup script for the Proctoring App
This script helps set up the Python backend dependencies and downloads required files.
"""

import os
import sys
import subprocess
import urllib.request

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(e.stderr)
        return False

def download_file(url, filename):
    """Download a file from URL"""
    print(f"📥 Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"✅ Downloaded {filename} successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return False

def main():
    print("🚀 Setting up Proctoring App Backend")
    print("=" * 50)

    # Check if we're in the backend directory
    if not os.path.exists('requirements.txt'):
        print("❌ Please run this script from the backend directory")
        sys.exit(1)

    # Install Python dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please check your Python environment.")
        sys.exit(1)

    # Download Haar cascade file
    cascade_url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
    if not os.path.exists('haarcascade_frontalface_default.xml'):
        if not download_file(cascade_url, 'haarcascade_frontalface_default.xml'):
            print("⚠️  Haar cascade download failed. The app will use Dlib if available.")
    else:
        print("✅ Haar cascade file already exists")

    # Test Dlib installation
    try:
        import dlib
        print("✅ Dlib is available for advanced face detection")
    except ImportError:
        print("⚠️  Dlib not available. Using OpenCV Haar cascades as fallback")

    # Test OpenCV
    try:
        import cv2
        print("✅ OpenCV is available")
    except ImportError:
        print("❌ OpenCV not available. Please reinstall requirements.")
        sys.exit(1)

    print("\n🎉 Backend setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the Python backend: python face_detection.py")
    print("2. In another terminal, start the React frontend: npm run dev")
    print("3. Open http://localhost:5173 in your browser")

if __name__ == "__main__":
    main()
