import socket
import json
import sys

def execute_in_blender(code_str, host="localhost", port=9876):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15.0)
    try:
        sock.connect((host, port))
        cmd = {
            "type": "execute_code",
            "params": {"code": code_str}
        }
        sock.sendall(json.dumps(cmd).encode("utf-8"))
        
        response_data = b""
        while True:
            chunk = sock.recv(8192)
            if not chunk:
                break
            response_data += chunk
            try:
                json.loads(response_data.decode("utf-8"))
                break
            except json.JSONDecodeError:
                continue
                
        res = json.loads(response_data.decode("utf-8"))
        print("[+] Resultado do Blender:")
        print(json.dumps(res, indent=2, ensure_ascii=False))
        return res
    except Exception as e:
        print(f"[-] Erro ao enviar comando: {e}")
        return None
    finally:
        sock.close()

if __name__ == "__main__":
    test_code = "print('Hello from MCP script!'); bpy.context.scene['mcp_test'] = 123"
    execute_in_blender(test_code)
