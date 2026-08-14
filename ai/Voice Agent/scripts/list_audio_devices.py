
import pyaudio

pa = pyaudio.PyAudio()
print(f"Default input device: {pa.get_default_input_device_info()['name']!r}\n")
print("All input-capable devices:")
for i in range(pa.get_device_count()):
    info = pa.get_device_info_by_index(i)
    if info["maxInputChannels"] > 0:
        print(f"  {i}: {info['name']}  (channels={info['maxInputChannels']}, rate={int(info['defaultSampleRate'])})")
pa.terminate()
