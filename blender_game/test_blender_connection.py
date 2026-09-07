import socket
import json
import sys

def test_connection(host="localhost", port=9876):
    print(f"[*] Tentando conectar ao Blender MCP em {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3.0)
    try:
        sock.connect((host, port))
        print("[+] Conectado com sucesso ao socket do Blender!")
        
        # Enviar comando de status / informacoes da cena
        cmd = {
            "type": "get_scene_info",
            "params": {}
        }
        sock.sendall(json.dumps(cmd).encode("utf-8"))
        
        # Receber resposta
        response_data = b""
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response_data += chunk
            try:
                json.loads(response_data.decode("utf-8"))
                break
            except json.JSONDecodeError:
                continue
                
        res = json.loads(response_data.decode("utf-8"))
        print("[+] Resposta recebida do Blender:")
        print(json.dumps(res, indent=2, ensure_ascii=False))
        return True
    except ConnectionRefusedError:
        print("[-] Conexao recusada! O servidor MCP no Blender ainda nao esta escutando na porta 9876.")
        print("[!] Dica: Feche e reabra o Blender (ou no painel lateral 'N' > 'MCP for Blender', clique em 'Connect to MCP server').")
        return False
    except Exception as e:
        print(f"[-] Erro: {e}")
        return False
    finally:
        sock.close()

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
