# Blender MCP - Criação de Modelos 3D e Jogos

Este repositório está configurado para conectar o **Blender** ao assistente de IA através do **Model Context Protocol (MCP)** (`blender-mcp`), permitindo modelagem 3D generativa, manipulação de cenas em tempo real e criação de assets para jogos.

---

## 🚀 Status da Instalação e Configuração

Todos os componentes necessários foram instalados e configurados no seu sistema:

1. **Servidor MCP (`blender-mcp`)**: Instalado e gerenciado via `uvx`.
2. **Add-on do Blender (`blender_mcp.py`)**: Instalado nos diretórios de scripts do Blender 5.2 e ativado nas preferências do usuário (`userpref.blend`).
3. **Configuração Global do Antigravity**:
   - Arquivo: `~/.gemini/config/mcp_config.json`
4. **Configuração para Cursor**:
   - Arquivo: `~/.cursor/mcp.json`

---

## 🔌 Como Conectar o Blender ao MCP

Como o add-on foi configurado com **Auto-Start Server** ativado:

1. **Reinicie o Blender**:
   - Se o Blender já estiver aberto, feche e abra-o novamente para carregar o novo complemento.
2. **Verifique no Blender**:
   - Na janela 3D (3D Viewport), pressione a tecla **`N`** para abrir o menu lateral direito.
   - Clique na aba **MCP for Blender**.
   - Você verá o status: `Connected on port 9876` (ou clique no botão **Connect to MCP server** caso não esteja conectado).
3. **Testar a conexão**:
   - No terminal, execute:
     ```powershell
     python test_blender_connection.py
     ```
   - Se retornar as informações da cena com sucesso, a IA tem controle direto do Blender em tempo real!

---

## 🎮 Como Usar com a IA para Criar Modelos 3D e Jogos

Com o Blender aberto e conectado, você pode pedir diretamente à IA:

### Exemplos de Comandos:
- *"Crie um cenário de masmorra low-poly com chão de pedra, 4 tochas nas paredes e um baú no centro."*
- *"Gere um personagem estilizado com cabeça esférica, corpo articulado e armadura básica."*
- *"Crie uma espada medieval low-poly com lâmina de aço e punho de couro dourado."*
- *"Adicione iluminação suave de três pontos e configure a câmera para renderizar um ângulo isométrico."*
- *"Exporte a seleção atual para a pasta `models/` no formato `.glb` otimizado para jogos."*

---

## 🛠️ Estrutura do Projeto

- `models/`: Pasta onde os assets 3D prontos para jogos (`.glb` / `.gltf`) são salvos.
- `scripts/`: Scripts Python auxiliares para geração em lote e pipelines automatizadas de assets.
  - `create_lowpoly_props.py`: Exemplo de script de geração procedural e exportação de baú e cristal.
- `test_blender_connection.py`: Script de teste para validar a conexão de socket na porta 9876.

---

## 📦 Integrações Extras Disponíveis no Painel do Blender

No painel **MCP for Blender** (tecla `N`), você também pode habilitar:
- **Poly Haven**: Texturas PBR e HDRIs gratuitas.
- **Poly Pizza**: Biblioteca de modelos low-poly CC0/CC-BY para prototipagem rápida de jogos.
- **Sketchfab**: Download de assets 3D via API.
- **Hyper3D Rodin / Hunyuan3D**: Geração de malhas 3D completas a partir de texto ou imagens com IA generativa.
