// MeetingMind Audio Recorder

class AudioRecorder {
  constructor(options = {}) {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.startTime = null;
    this.timerInterval = null;
    this.onTranscriptUpdate = options.onTranscriptUpdate || (() => {});
    this.onError = options.onError || console.error;
  }

  async start(noteId = null) {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Determine available MIME type
      const mimeType = this.getSupportedMimeType();
      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        console.log('Recording stopped. Size:', audioBlob.size, 'bytes');
        
        // Emit transcript update with placeholder
        this.onTranscriptUpdate({
          status: 'processing',
          text: 'Processing audio...'
        });

        // Upload for transcription if we have an API
        if (window.api) {
          try {
            const result = await window.api.uploadAudio(audioBlob, noteId);
            this.onTranscriptUpdate({
              status: 'complete',
              text: result.transcript || 'Transcription complete.'
            });
          } catch (err) {
            this.onTranscriptUpdate({
              status: 'error',
              text: 'Transcription failed: ' + err.message
            });
          }
        }
      };

      this.mediaRecorder.onerror = (event) => {
        this.onError('Recording error: ' + event.error);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.startTime = Date.now();

      // Start timer
      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);

      console.log('Recording started');
      return true;
    } catch (err) {
      this.onError('Failed to start recording: ' + err.message);
      return false;
    }
  }

  stop() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      // Clear timer
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      console.log('Recording stopped');
      return true;
    }
    return false;
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  updateTimer() {
    if (!this.startTime) return;
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const display = [hours, minutes % 60, seconds % 60]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');

    // Dispatch custom event for UI to listen
    window.dispatchEvent(new CustomEvent('recording-timer', { detail: { time: display, seconds } }));
  }

  getRecordingState() {
    return {
      isRecording: this.isRecording,
      duration: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      state: this.mediaRecorder?.state || 'inactive'
    };
  }
}

// Export
window.AudioRecorder = AudioRecorder;
