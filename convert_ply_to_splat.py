import struct
import numpy as np
import time

TYPE_MAP = {
    'double': 'd',
    'int': 'i',
    'uint': 'I',
    'float': 'f',
    'short': 'h',
    'ushort': 'H',
    'uchar': 'B',
}

def clamp(value, min_value=0, max_value=255):
    return max(min_value, min(value, max_value))

def process_ply_buffer(input_buffer):
    header_end = b"end_header\n"
    header_end_index = input_buffer.find(header_end)
    if header_end_index < 0:
        raise ValueError("Unable to read .ply file header")
    header = input_buffer[:header_end_index].decode()
    
    vertex_count = int(next((int(s.split()[-1]) for s in header.splitlines() if s.startswith("element vertex")), None))
    print("Vertex Count", vertex_count)

    row_offset = 0
    offsets = {}
    types = {}

    for prop in (s for s in header.splitlines() if s.startswith("property ")):
        _, type_, name = prop.split()
        array_type = TYPE_MAP[type_]
        types[name] = array_type
        offsets[name] = row_offset
        row_offset += struct.calcsize(array_type)

    print("Bytes per row", row_offset, types, offsets)
    
    data_offset = header_end_index + len(header_end)
    
    def get_attr(name, row):
        if name not in types:
            raise ValueError(f"{name} not found")
        return struct.unpack_from(types[name], input_buffer, data_offset + row * row_offset + offsets[name])[0]
    
    size_list = np.zeros(vertex_count, dtype=np.float32)
    size_index = np.arange(vertex_count, dtype=np.uint32)
    
    start_time = time.time()
    for row in range(vertex_count):
        if "scale_0" not in types:
            continue
        size = np.exp(get_attr('scale_0', row)) * np.exp(get_attr('scale_1', row)) * np.exp(get_attr('scale_2', row))
        opacity = 1 / (1 + np.exp(-get_attr('opacity', row)))
        size_list[row] = size * opacity
    print("calculate importance:", time.time() - start_time, "seconds")

    start_time = time.time()
    size_index = np.argsort(size_list)[::-1]
    print("sort:", time.time() - start_time, "seconds")

    row_length = 3 * 4 + 3 * 4 + 4 + 4
    buffer = bytearray(row_length * vertex_count)

    start_time = time.time()
    for j in range(vertex_count):
        row = size_index[j]

        position_offset = j * row_length
        scales_offset = position_offset + 4 * 3
        rgba_offset = scales_offset + 4 * 3
        rot_offset = rgba_offset + 4
        
        if "scale_0" in types:
            qlen = np.sqrt(sum(get_attr(f'rot_{i}', row)**2 for i in range(4)))

            rot_values = [(get_attr(f'rot_{i}', row) / qlen) * 128 + 128 for i in range(4)]
            buffer[rot_offset:rot_offset+4] = struct.pack('4B', *map(int, rot_values))

            scales_values = [np.exp(get_attr(f'scale_{i}', row)) for i in range(3)]
            buffer[scales_offset:scales_offset+12] = struct.pack('3f', *scales_values)
        else:
            buffer[scales_offset:scales_offset+12] = struct.pack('3f', 0.01, 0.01, 0.01)
            buffer[rot_offset:rot_offset+4] = struct.pack('4B', 255, 0, 0, 0)

        position_values = [get_attr(axis, row) for axis in ('x', 'y', 'z')]
        buffer[position_offset:position_offset+12] = struct.pack('3f', *position_values)
        
        if "f_dc_0" in types:
            SH_C0 = 0.28209479177387814
            rgba_values = [(0.5 + SH_C0 * get_attr(f'f_dc_{i}', row)) * 255 for i in range(3)]
        else:
            rgba_values = [get_attr(color, row) for color in ('red', 'green', 'blue')]
        
        if "opacity" in types:
            opacity = (1 / (1 + np.exp(-get_attr('opacity', row)))) * 255
        else:
            opacity = 255

        # print(rgba_values, opacity)
        
        buffer[rgba_offset:rgba_offset+4] = struct.pack('4B', 
            clamp(int(rgba_values[0])),
            clamp(int(rgba_values[1])),
            clamp(int(rgba_values[2])),
            clamp(int(opacity))
        )
    
    print("build buffer:", time.time() - start_time, "seconds")
    
    return buffer


if __name__ == "__main__":
    try:
        with open('input.ply', 'rb') as f:
            input_data = f.read()
    except Exception as e:
        print("Error reading the file:", e)
        exit()

    processed_data = process_ply_buffer(input_data)

    try:
        with open('src/output.splat', 'wb') as f:
            f.write(processed_data)
    except Exception as e:
        print("Error writing the file:", e)
        exit()

    print('File successfully processed and saved as output.splat')
