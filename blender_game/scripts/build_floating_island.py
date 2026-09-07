"""
build_floating_island.py - Versao 4.1: Mundo Completo com Detalhes Ricos
- Ilha 1: Árvores de outono, pedras, cristais, caminho de pedra e Portal 1.
- Ilha 2: Ilha Celestial de Chegada com Portal 2 de Retorno e acesso à Ponte.
- Ponte Celestial: 30 metros de extensão com piso de luz e lanternas de cristal.
- Ilha 3: Santuário com Altar em degraus e Monólito de Cristal Cósmico Gigante.
- Personagem Aventureiro posicionado no início.
"""
import bpy
import math
import os
import random

def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)

def create_material(name, base_color, roughness=0.6, metallic=0.0, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if emission_color:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission_color
                bsdf.inputs["Emission Strength"].default_value = emission_strength
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission_color
                if "Emission Strength" in bsdf.inputs:
                    bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def build_world_sunset():
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("Sunset_World")
        bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputWorld")
    bg = nodes.new(type="ShaderNodeBackground")
    color_ramp = nodes.new(type="ShaderNodeValToRGB")
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    sep_xyz = nodes.new(type="ShaderNodeSeparateXYZ")

    math_mult = nodes.new(type="ShaderNodeMath")
    math_mult.operation = 'MULTIPLY'
    math_mult.inputs[1].default_value = 0.5

    math_add = nodes.new(type="ShaderNodeMath")
    math_add.operation = 'ADD'
    math_add.inputs[1].default_value = 0.5

    links.new(tex_coord.outputs["Normal"], sep_xyz.inputs["Vector"])
    links.new(sep_xyz.outputs["Z"], math_mult.inputs[0])
    links.new(math_mult.outputs["Value"], math_add.inputs[0])
    links.new(math_add.outputs["Value"], color_ramp.inputs["Fac"])

    elements = color_ramp.color_ramp.elements
    elements[0].position = 0.35
    elements[0].color = (0.78, 0.32, 0.18, 1.0)
    elements[1].position = 0.51
    elements[1].color = (1.0, 0.52, 0.08, 1.0)

    elem_mid = color_ramp.color_ramp.elements.new(0.66)
    elem_mid.color = (0.85, 0.18, 0.35, 1.0)

    elem_violet = color_ramp.color_ramp.elements.new(0.82)
    elem_violet.color = (0.26, 0.10, 0.48, 1.0)

    elem_zenith = color_ramp.color_ramp.elements.new(0.98)
    elem_zenith.color = (0.05, 0.03, 0.18, 1.0)

    bg.inputs["Strength"].default_value = 1.6
    links.new(color_ramp.outputs["Color"], bg.inputs["Color"])
    links.new(bg.outputs["Background"], output.inputs["Surface"])

def build_single_island(prefix, center_x, center_y, base_z, radius=7.8, mat_rock=None, mat_grass=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=14,
        radius1=radius,
        radius2=0.3,
        depth=9.5,
        location=(center_x, center_y, base_z - 4.2)
    )
    base_rock = bpy.context.active_object
    base_rock.name = f"{prefix}_Rock_Base"
    base_rock.rotation_euler = (math.pi, 0, 0)
    base_rock.data.materials.append(mat_rock)
    
    for v in base_rock.data.vertices:
        if v.co.z < 0:
            v.co.x += random.uniform(-0.7, 0.7)
            v.co.y += random.uniform(-0.7, 0.7)
            v.co.z += random.uniform(-0.5, 0.5)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=radius + 0.2,
        depth=1.8,
        location=(center_x, center_y, base_z)
    )
    grass_top = bpy.context.active_object
    grass_top.name = f"{prefix}_Grass_Top"
    grass_top.data.materials.append(mat_grass)
    
    for v in grass_top.data.vertices:
        if v.co.z > 0:
            v.co.z += random.uniform(-0.15, 0.25)
            v.co.x += random.uniform(-0.2, 0.2)
            v.co.y += random.uniform(-0.2, 0.2)

    bev = grass_top.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.28
    bev.segments = 2
    bpy.ops.object.modifier_apply(modifier="Bevel")

def build_portal(prefix, px, py, pz, rot_z, mat_stone, mat_portal_glow, mat_portal_rim):
    for step, (rad, h) in enumerate([(3.4, 0.28), (2.7, 0.28), (2.0, 0.25)]):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=14,
            radius=rad,
            depth=h,
            location=(px, py, pz + step * 0.25)
        )
        base = bpy.context.active_object
        base.name = f"{prefix}_Dais_Step_{step+1}"
        base.data.materials.append(mat_stone)

    portal_base_z = pz + 0.8
    pillar_dist = 2.2
    pillar_h = 5.2

    for side, sign in [("Left", -1), ("Right", 1)]:
        col_x = px + math.cos(rot_z) * (sign * pillar_dist)
        col_y = py + math.sin(rot_z) * (sign * pillar_dist)
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(col_x, col_y, portal_base_z + pillar_h / 2)
        )
        pillar = bpy.context.active_object
        pillar.name = f"{prefix}_Pillar_{side}"
        pillar.scale = (0.85, 0.85, pillar_h)
        pillar.rotation_euler = (0, 0, rot_z)
        pillar.data.materials.append(mat_stone)

        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(col_x, col_y, portal_base_z + pillar_h + 0.25)
        )
        cap = bpy.context.active_object
        cap.name = f"{prefix}_Cap_{side}"
        cap.scale = (1.15, 1.15, 0.5)
        cap.rotation_euler = (0, 0, rot_z)
        cap.data.materials.append(mat_stone)

    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(px, py, portal_base_z + pillar_h + 0.5)
    )
    arch = bpy.context.active_object
    arch.name = f"{prefix}_Arch_Top"
    arch.scale = (pillar_dist * 2 + 1.4, 0.9, 0.65)
    arch.rotation_euler = (0, 0, rot_z)
    arch.data.materials.append(mat_stone)

    bpy.ops.mesh.primitive_circle_add(
        vertices=32,
        radius=1.85,
        fill_type='NGON',
        location=(px, py, portal_base_z + 2.5)
    )
    vortex = bpy.context.active_object
    vortex.name = f"{prefix}_Vortex_Core"
    vortex.rotation_euler = (math.radians(90), 0, rot_z)
    vortex.data.materials.append(mat_portal_glow)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=2.0,
        minor_radius=0.18,
        location=(px, py, portal_base_z + 2.5)
    )
    ring = bpy.context.active_object
    ring.name = f"{prefix}_Vortex_Rim"
    ring.rotation_euler = (math.radians(90), 0, rot_z)
    ring.data.materials.append(mat_portal_rim)

    bpy.ops.object.light_add(type='POINT', radius=1.2, location=(px, py, portal_base_z + 2.5))
    p_light = bpy.context.active_object
    p_light.name = f"{prefix}_Point_Light"
    p_light.data.energy = 450.0
    p_light.data.color = (0.1, 0.9, 1.0)

def build_celestial_bridge(start_y, end_y, bridge_z, mat_stone, mat_bridge_glow):
    length = end_y - start_y
    steps = 14
    step_len = length / steps

    for i in range(steps):
        y_pos = start_y + (i + 0.5) * step_len
        arch_norm = math.sin((i / (steps - 1)) * math.pi)
        h = bridge_z + arch_norm * 1.5

        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(0, y_pos, h)
        )
        paving = bpy.context.active_object
        paving.name = f"Bridge_Slab_{i+1}"
        paving.scale = (3.4, step_len * 0.92, 0.45)
        paving.data.materials.append(mat_stone)

        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(0, y_pos, h + 0.25)
        )
        light_strip = bpy.context.active_object
        light_strip.name = f"Bridge_Light_Strip_{i+1}"
        light_strip.scale = (1.4, step_len * 0.85, 0.08)
        light_strip.data.materials.append(mat_bridge_glow)

        if i % 3 == 0:
            for side, sign in [("L", -1), ("R", 1)]:
                bpy.ops.mesh.primitive_cylinder_add(
                    vertices=6,
                    radius=0.22,
                    depth=1.1,
                    location=(sign * 1.65, y_pos, h + 0.6)
                )
                post = bpy.context.active_object
                post.name = f"Bridge_Post_{i+1}_{side}"
                post.data.materials.append(mat_stone)

                bpy.ops.mesh.primitive_ico_sphere_add(
                    subdivisions=1,
                    radius=0.18,
                    location=(sign * 1.65, y_pos, h + 1.25)
                )
                gem = bpy.context.active_object
                gem.name = f"Bridge_Gem_{i+1}_{side}"
                gem.data.materials.append(mat_bridge_glow)

def build_sanctuary_altar(cx, cy, base_z, mat_stone, mat_glow):
    for step, (rad, h) in enumerate([(3.2, 0.4), (2.2, 0.35), (1.4, 0.3)]):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12,
            radius=rad,
            depth=h,
            location=(cx, cy, base_z + step * 0.35 + 0.2)
        )
        altar_base = bpy.context.active_object
        altar_base.name = f"Sanctuary_Altar_Step_{step+1}"
        altar_base.data.materials.append(mat_stone)

    altar_top_z = base_z + 1.8
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=1.2,
        location=(cx, cy, altar_top_z + 2.0)
    )
    monolith = bpy.context.active_object
    monolith.name = "Sanctuary_Grand_Crystal"
    monolith.scale = (0.75, 0.75, 2.4)
    monolith.rotation_euler = (0.1, 0.1, 0.78)
    monolith.data.materials.append(mat_glow)

    bpy.ops.object.light_add(type='POINT', radius=2.5, location=(cx, cy, altar_top_z + 2.0))
    altar_light = bpy.context.active_object
    altar_light.name = "Sanctuary_Point_Light"
    altar_light.data.energy = 800.0
    altar_light.data.color = (0.7, 0.3, 1.0)

def build_vegetation_island_1(mat_wood, mat_leaves, mat_crystal, mat_path):
    # Caminho de pedras da Ilha 1
    path_points = [
        (-2.8, -4.2, 2.1),
        (-2.1, -3.0, 2.1),
        (-1.4, -1.8, 2.12),
        (-0.8, -0.6, 2.15),
        (-0.2, 0.6, 2.15),
        (0.0, 1.8, 2.18)
    ]
    for i, (x, y, z) in enumerate(path_points):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=7,
            radius=random.uniform(0.65, 0.95),
            depth=0.22,
            location=(x, y, z)
        )
        stone = bpy.context.active_object
        stone.name = f"Path_Stone_{i+1}"
        stone.data.materials.append(mat_path)

    # 5 Árvores
    tree_locs = [(-5.2, -1.5, 2.0), (5.0, 0.0, 2.0), (-4.5, 4.2, 2.0), (4.5, 4.2, 2.0), (-2.0, -5.5, 2.0)]
    for idx, (tx, ty, tz) in enumerate(tree_locs):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.35, depth=2.4, location=(tx, ty, tz + 1.2))
        trunk = bpy.context.active_object
        trunk.name = f"Tree_Trunk_{idx+1}"
        trunk.data.materials.append(mat_wood)
        
        for level in range(3):
            bpy.ops.mesh.primitive_cone_add(
                vertices=7,
                radius1=1.9 - level * 0.4,
                radius2=0.0,
                depth=1.5,
                location=(tx, ty, tz + 2.2 + level * 0.9)
            )
            foliage = bpy.context.active_object
            foliage.name = f"Tree_Foliage_{idx+1}_{level+1}"
            foliage.data.materials.append(mat_leaves)

    # Cristais mágicos no chão
    crystal_locs = [
        (-1.5, -2.5, 2.1),
        (2.2, -2.2, 2.1),
        (1.5, 1.0, 2.1),
        (-2.5, 1.2, 2.1),
        (3.4, 3.2, 2.1),
        (-1.6, 3.2, 2.1),
        (1.6, 3.2, 2.1)
    ]
    for idx, (cx, cy, cz) in enumerate(crystal_locs):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.36, location=(cx, cy, cz + 0.35))
        cryst = bpy.context.active_object
        cryst.name = f"Ground_Crystal_{idx+1}"
        cryst.scale = (0.55, 0.55, 1.9)
        cryst.data.materials.append(mat_crystal)

def build_player_character(mat_suit, mat_visor, mat_accent, mat_dark):
    start_pos = (-2.8, -4.2, 2.15)
    bpy.ops.object.empty_add(type='ARROWS', location=start_pos)
    player_root = bpy.context.active_object
    player_root.name = "Player_Character"
    player_root.rotation_euler = (0, 0, math.radians(55))

    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.40, depth=0.85, location=(0, 0, 0.75))
    body = bpy.context.active_object
    body.name = "Player_Body"
    body.parent = player_root
    body.data.materials.append(mat_suit)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.35, location=(0, 0, 1.35))
    head = bpy.context.active_object
    head.name = "Player_Head"
    head.parent = player_root
    head.data.materials.append(mat_suit)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.28, 1.35))
    visor = bpy.context.active_object
    visor.name = "Player_Visor"
    visor.scale = (0.38, 0.12, 0.16)
    visor.parent = player_root
    visor.data.materials.append(mat_visor)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.32, 0.8))
    pack = bpy.context.active_object
    pack.name = "Player_Backpack"
    pack.scale = (0.42, 0.22, 0.55)
    pack.parent = player_root
    pack.data.materials.append(mat_accent)

    for side, sign in [("L", -1), ("R", 1)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.14, depth=0.55, location=(sign * 0.20, 0, 0.28))
        leg = bpy.context.active_object
        leg.name = f"Player_Leg_{side}"
        leg.parent = player_root
        leg.data.materials.append(mat_dark)

def main():
    print("[*] Construindo Reino Completo: Ilhas, Ponte Celestial e Vegetação...")
    clean_scene()
    random.seed(42)

    mat_rock = create_material("Mat_Island_Rock", (0.24, 0.22, 0.20, 1.0), roughness=0.9)
    mat_grass_1 = create_material("Mat_Island_Grass", (0.17, 0.54, 0.20, 1.0), roughness=0.6)
    mat_grass_celestial = create_material("Mat_Celestial_Grass", (0.15, 0.58, 0.38, 1.0), roughness=0.55)
    mat_stone = create_material("Mat_Path_Stone", (0.42, 0.39, 0.35, 1.0), roughness=0.8)
    mat_portal_stone = create_material("Mat_Portal_Stone", (0.09, 0.09, 0.11, 1.0), roughness=0.7)
    mat_wood = create_material("Mat_Wood", (0.22, 0.13, 0.07, 1.0), roughness=0.85)
    mat_leaves = create_material("Mat_Leaves", (0.92, 0.38, 0.10, 1.0), roughness=0.5)
    
    mat_portal_glow = create_material("Mat_Portal_Glow", (0.0, 0.92, 1.0, 1.0), emission_color=(0.0, 0.92, 1.0, 1.0), emission_strength=12.0)
    mat_portal_rim = create_material("Mat_Portal_Rim", (0.85, 0.15, 1.0, 1.0), emission_color=(0.85, 0.15, 1.0, 1.0), emission_strength=8.0)
    mat_bridge_glow = create_material("Mat_Bridge_Glow", (0.2, 0.85, 1.0, 1.0), emission_color=(0.2, 0.85, 1.0, 1.0), emission_strength=10.0)
    mat_crystal = create_material("Mat_Crystal", (0.1, 0.95, 0.85, 1.0), emission_color=(0.1, 0.95, 0.85, 1.0), emission_strength=5.0)
    mat_sun = create_material("Mat_Sun", (1.0, 0.78, 0.35, 1.0), emission_color=(1.0, 0.78, 0.35, 1.0), emission_strength=35.0)

    mat_suit = create_material("Mat_Player_Suit", (0.12, 0.35, 0.85, 1.0), roughness=0.4, metallic=0.2)
    mat_accent = create_material("Mat_Player_Accent", (0.95, 0.65, 0.15, 1.0), roughness=0.3, metallic=0.4)
    mat_visor = create_material("Mat_Player_Visor", (0.0, 0.95, 1.0, 1.0), emission_color=(0.0, 0.95, 1.0, 1.0), emission_strength=8.0)
    mat_dark = create_material("Mat_Player_Boots", (0.15, 0.15, 0.18, 1.0), roughness=0.7)

    build_world_sunset()

    # 1. Ilha 1 e elementos
    build_single_island("Island_1", 0.0, 0.0, 1.2, radius=7.8, mat_rock=mat_rock, mat_grass=mat_grass_1)
    build_portal("Portal_1", 0.0, 3.2, 2.2, 0.0, mat_portal_stone, mat_portal_glow, mat_portal_rim)
    build_vegetation_island_1(mat_wood, mat_leaves, mat_crystal, mat_stone)
    build_player_character(mat_suit, mat_visor, mat_accent, mat_dark)

    # 2. Ilha 2 (Ilha Celestial A)
    build_single_island("Island_2", 0.0, 60.0, 6.0, radius=7.8, mat_rock=mat_rock, mat_grass=mat_grass_celestial)
    build_portal("Portal_2", 0.0, 52.0, 7.0, math.pi, mat_portal_stone, mat_portal_glow, mat_portal_rim)

    # 3. Ponte Celestial
    build_celestial_bridge(start_y=67.0, end_y=97.0, bridge_z=7.2, mat_stone=mat_stone, mat_bridge_glow=mat_bridge_glow)

    # 4. Ilha 3 (Santuário)
    build_single_island("Island_3", 0.0, 105.0, 6.0, radius=8.5, mat_rock=mat_rock, mat_grass=mat_grass_celestial)
    build_sanctuary_altar(0.0, 105.0, 7.2, mat_stone, mat_portal_glow)

    # Sol
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=6.5, location=(25.0, 120.0, 18.0))
    sun_mesh = bpy.context.active_object
    sun_mesh.name = "Sunset_Sun_Disc"
    sun_mesh.data.materials.append(mat_sun)

    bpy.ops.object.light_add(type='SUN', location=(25.0, 110.0, 25.0))
    sun = bpy.context.active_object
    sun.name = "Sunset_Sun_Light"
    sun.data.energy = 5.5
    sun.data.color = (1.0, 0.62, 0.28)
    sun.rotation_euler = (math.radians(-30), math.radians(20), math.radians(-35))

    # Câmera em 3ª pessoa inicial atrás do personagem na Ilha 1
    bpy.ops.object.camera_add(location=(-14.5, -16.5, 9.2))
    cam = bpy.context.active_object
    cam.name = "Main_Camera"
    cam.rotation_euler = (math.radians(72), 0, math.radians(-42))
    cam.data.lens = 38
    bpy.context.scene.camera = cam

    base_dir = r"d:\Users\Home\Documents\repos\playful-hub-sandbox\blender_game"
    blend_path = os.path.join(base_dir, "models", "floating_island.blend")
    glb_path = os.path.join(base_dir, "models", "floating_island.glb")

    print(f"[*] Salvando .blend em: {blend_path}")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    print(f"[*] Exportando .glb em: {glb_path}")
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB')
    print("[+] Ilhas e Ponte geradas e exportadas com sucesso!")

if __name__ == "__main__":
    main()
