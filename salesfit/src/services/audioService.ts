const CHUNK_DURATION_MS = 15_000;

class AudioService {
  private _isRecording = false;
  private _startTime: number | null = null;
  private _mediaRecorder: MediaRecorder | null = null;
  private _stream: MediaStream | null = null;
  private _chunkIndex = 0;
  private _onChunkReady: ((chunkBase64: string, chunkIndex: number) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async startRecording(
    onChunkReady: (chunkBase64: string, chunkIndex: number) => void,
  ): Promise<void> {
    if (this._isRecording) return;

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._isRecording = true;
    this._startTime = Date.now();
    this._chunkIndex = 0;
    this._onChunkReady = onChunkReady;

    this._startMediaRecorder();
  }

  async stopRecording(): Promise<void> {
    this._isRecording = false;

    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get elapsedMs(): number {
    if (this._startTime === null) return 0;
    return Date.now() - this._startTime;
  }

  private _startMediaRecorder(): void {
    if (!this._stream) return;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(this._stream, { mimeType });
    this._mediaRecorder = recorder;

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: mimeType });
      const index = this._chunkIndex++;

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (base64 && this._onChunkReady) {
          this._onChunkReady(base64, index);
        }
      };
      reader.readAsDataURL(blob);

      // 녹음 중이면 다음 청크 시작
      if (this._isRecording) {
        chunks.length = 0;
        this._startMediaRecorder();
      } else {
        this._stream?.getTracks().forEach((t) => t.stop());
        this._stream = null;
        this._startTime = null;
        this._onChunkReady = null;
        this._chunkIndex = 0;
      }
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, CHUNK_DURATION_MS);
  }
}

export const audioService = new AudioService();
