import { Audio } from 'expo-av';

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn(),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
}));

// Import after mock to get the singleton with mocked expo-av
import { audioService } from '../audioService';

describe('AudioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Audio.setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
    (Audio.Recording.createAsync as jest.Mock).mockResolvedValue({
      recording: {
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file://chunk.m4a'),
      },
    });
  });

  afterEach(async () => {
    if (audioService.isRecording) {
      await audioService.stopRecording();
    }
  });

  test('requestPermissions returns false when permission is denied', async () => {
    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const result = await audioService.requestPermissions();

    expect(result).toBe(false);
  });

  test('startRecording ignores duplicate calls when already recording', async () => {
    const onChunkReady = jest.fn();

    await audioService.startRecording(onChunkReady);
    await audioService.startRecording(onChunkReady);

    expect(Audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(Audio.Recording.createAsync).toHaveBeenCalledTimes(1);
  });

  test('stopRecording sets isRecording to false', async () => {
    const onChunkReady = jest.fn();

    await audioService.startRecording(onChunkReady);
    expect(audioService.isRecording).toBe(true);

    await audioService.stopRecording();
    expect(audioService.isRecording).toBe(false);
  });
});
