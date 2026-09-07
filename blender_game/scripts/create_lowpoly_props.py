"""
Exemplo de script para criacao de assets de jogos no Blender.
Gera modelos low-poly (barril, bau, moeda/cristal) com materiais e exporta para .glb.
Pode ser executado diretamente pelo Blender MCP via execute_blender_code
ou executado pelo terminal:
    blender-launcher -b --python scripts/create_lowpoly_props.py
"""
import bpy
import os
import math

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def create_colored_material(name, color_rgba, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color_rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat

def create_crystal(output_dir):
    clean_scene()
    
    # Criar icosphere para cristal pontiagudo
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=(0, 0, 1.5))
    crystal = bpy.context.active_object
    crystal.name = "Game_Crystal"
    crystal.scale = (0.7, 0.7, 1.8)
    bpy.ops.object.transform_apply(scale=True)
    
    # Material brilhante
    mat = create_colored_material("Crystal_Mat", (0.1, 0.8, 0.9, 1.0), roughness=0.1, metallic=0.2)
    crystal.data.materials.append(mat)
    
    out_path = os.path.join(output_dir, "crystal.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB')
    print(f"[+] Cristal exportado para: {out_path}")

def create_game_crate(output_dir):
    clean_scene()
    
    # Criar caixa/bau
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0, 0, 1.0))
    crate = bpy.context.active_object
    crate.name = "Game_Crate"
    
    # Bevel modifier para aparencia de jogo
    bevel = crate.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.08
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier="Bevel")
    
    mat = create_colored_material("Wood_Mat", (0.45, 0.28, 0.15, 1.0), roughness=0.8, metallic=0.0)
    crate.data.materials.append(mat)
    
    out_path = os.path.join(output_dir, "crate.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB')
    print(f"[+] Caixa exportada para: {out_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    print("[*] Gerando modelos para jogos...")
    create_crystal(models_dir)
    create_game_crate(models_dir)
    print("[+] Modelos gerados com sucesso na pasta models/!")
