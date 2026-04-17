import { Audio } from 'expo-av';

const CHUNK_DURATION_MS = 15_000;

class AudioService {
  private _isRecording = false;
  private _startTime: number | null = null;
  private _recording: Audio.Recording | null = null;
  private _chunkInterval: ReturnType<typeof setInterval> | null = null;
  private _chunkIndex = 0;
  private _onChunkReady: ((chunkUri: string, chunkIndex: number) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(
    onChunkReady: (chunkUri: string, chunkIndex: number) => void,
  ): Promise<void> {
    if (this._isRecording) return;

    this._isRecording = true;
    this._startTime = Date.now();
    this._chunkIndex = 0;
    this._onChunkReady = onChunkReady;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    await this._startNewRecording();

    this._chunkInterval = setInterval(() => {
      void this._rotateChunk();
    }, CHUNK_DURATION_MS);
  }

  async stopRecording(): Promise<void> {
    if (this._chunkInterval !== null) {
      clearInterval(this._chunkInterval);
      this._chunkInterval = null;
    }

    if (this._recording !== null) {
      try {
        const recording = this._recording;
        this._recording = null;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri !== null && this._onChunkReady !== null) {
          this._onChunkReady(uri, this._chunkIndex++);
        }
      } catch (error) {
        console.error('AudioService: stop recording error', error);
      }
    }

    this._isRecording = false;
    this._startTime = null;
    this._onChunkReady = null;
    this._chunkIndex = 0;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get elapsedMs(): number {
    if (this._startTime === null) return 0;
    return Date.now() - this._startTime;
  }

  private async _startNewRecording(): Promise<void> {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    this._recording = recording;
  }

  private async _rotateChunk(): Promise<void> {
    if (this._recording === null) return;

    try {
      const recording = this._recording;
      this._recording = null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri !== null && this._onChunkReady !== null) {
        this._onChunkReady(uri, this._chunkIndex++);
      }
      if (this._isRecording) {
        await this._startNewRecording();
      }
    } catch (error) {
      console.error('AudioService: chunk rotation error', error);
      this._isRecording = false;
    }
  }
}

export const audioService = new AudioService();
