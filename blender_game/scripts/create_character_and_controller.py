"""
create_character_and_controller.py - Versao 5.0: Colisões e Portal Dimensional
- Colisões físicas em todas as 5 árvores e nos pilares de pedra dos portais.
- Elevação e subida em degraus no pedestal do portal e no altar do santuário.
- Travessia da Ponte Celestial (30m de extensão sobre o abismo).
- Evento de teletransporte instantâneo ao cruzar os portais!
"""
import bpy
import math
import mathutils
import os

CONTROLLER_SCRIPT = '''
import bpy
import math
import mathutils
import time

class GAME_OT_PlayFloatingIsland(bpy.types.Operator):
    """Controle o personagem com W,A,S,D e SPACE. Gire a câmera com o Mouse! Entre no portal para viajar para a Ponte Celestial! ESC para sair."""
    bl_idname = "game.play_island"
    bl_label = "Jogar no Reino Celestial (WASD + Mouse)"

    def __init__(self):
        self.keys = set()
        self.vel_z = 0.0
        self.is_grounded = True
        self.move_speed = 7.5
        self.jump_force = 9.5
        self.gravity = 22.0
        self.last_time = time.time()
        self.timer = None
        self.player = None
        self.cam = None

        # Câmera Orbital com Mouse
        self.cam_yaw = math.radians(205)
        self.cam_pitch = math.radians(20)
        self.cam_dist = 9.5
        self.mouse_dragging = False
        self.prev_mouse_x = 0
        self.prev_mouse_y = 0

        # Árvores da Ilha 1 (troncos com colisão sólida)
        self.trees_i1 = [
            (-5.2, -1.5, 0.65),
            (5.0, 0.0, 0.65),
            (-4.5, 4.2, 0.65),
            (4.5, 4.2, 0.65),
            (-2.0, -5.5, 0.65)
        ]

        # Pilares do Portal 1 e Portal 2
        self.portal_pillars = [
            (-2.2, 3.2, 0.55), (2.2, 3.2, 0.55),   # Portal 1
            (-2.2, 52.0, 0.55), (2.2, 52.0, 0.55)  # Portal 2
        ]

        self.warp_cooldown = 0.0

    def invoke(self, context, event):
        self.player = bpy.data.objects.get("Player_Character")
        if not self.player:
            self.report({'ERROR'}, "Objeto 'Player_Character' nao encontrado na cena!")
            return {'CANCELLED'}

        self.cam = bpy.data.objects.get("Main_Camera")
        self.keys.clear()
        self.vel_z = 0.0
        self.is_grounded = True
        self.last_time = time.time()
        self.mouse_dragging = False
        self.warp_cooldown = 0.0

        wm = context.window_manager
        self.timer = wm.event_timer_add(0.016, window=context.window)
        wm.modal_handler_add(self)

        self.report({'INFO'}, "🎮 MODO JOGO ATIVADO! W,A,S,D: Andar | SPACE: Pular | MOUSE: Girar Camera | Atravesse o Portal! ESC: Sair")
        print("[*] Jogo Ativo! W,A,S,D = Andar | SPACE = Pular | Mouse = Girar Câmera | ESC = Sair")
        return {'RUNNING_MODAL'}

    def modal(self, context, event):
        if event.type == 'ESC':
            self.cleanup(context)
            self.report({'INFO'}, "Modo Jogo encerrado.")
            return {'FINISHED'}

        # Mouse
        if event.type in {'RIGHTMOUSE', 'MIDDLEMOUSE', 'LEFTMOUSE'}:
            if event.value == 'PRESS':
                self.mouse_dragging = True
                self.prev_mouse_x = event.mouse_x
                self.prev_mouse_y = event.mouse_y
            elif event.value == 'RELEASE':
                self.mouse_dragging = False

        if event.type == 'MOUSEMOVE' and self.mouse_dragging:
            dx = event.mouse_x - self.prev_mouse_x
            dy = event.mouse_y - self.prev_mouse_y
            self.prev_mouse_x = event.mouse_x
            self.prev_mouse_y = event.mouse_y

            sensitivity = 0.006
            self.cam_yaw -= dx * sensitivity
            self.cam_pitch = max(math.radians(2), min(math.radians(75), self.cam_pitch + dy * sensitivity))

        if event.type == 'WHEELUPMOUSE':
            self.cam_dist = max(4.0, self.cam_dist - 0.8)
        elif event.type == 'WHEELDOWNMOUSE':
            self.cam_dist = min(22.0, self.cam_dist + 0.8)

        # Teclado
        if event.type in {'W', 'A', 'S', 'D', 'SPACE'}:
            if event.value == 'PRESS':
                self.keys.add(event.type)
            elif event.value == 'RELEASE':
                self.keys.discard(event.type)

        # Loop de Física (TIMER)
        if event.type == 'TIMER':
            now = time.time()
            dt = min(now - self.last_time, 0.05)
            self.last_time = now

            if not self.player:
                return {'PASS_THROUGH'}

            if self.warp_cooldown > 0:
                self.warp_cooldown -= dt

            loc = self.player.location

            # Movimento relativo à Câmera
            fwd_x = -math.sin(self.cam_yaw)
            fwd_y = -math.cos(self.cam_yaw)
            right_x = -fwd_y
            right_y = fwd_x

            move_x = 0.0
            move_y = 0.0

            if 'W' in self.keys:
                move_x += fwd_x
                move_y += fwd_y
            if 'S' in self.keys:
                move_x -= fwd_x
                move_y -= fwd_y
            if 'A' in self.keys:
                move_x -= right_x
                move_y -= right_y
            if 'D' in self.keys:
                move_x += right_x
                move_y += right_y

            mag = math.sqrt(move_x**2 + move_y**2)
            if mag > 0:
                step_x = (move_x / mag) * self.move_speed * dt
                step_y = (move_y / mag) * self.move_speed * dt
                new_x = loc.x + step_x
                new_y = loc.y + step_y

                # ==========================================
                # RESOLUÇÃO DE COLISÕES COM ÁRVORES
                # ==========================================
                player_r = 0.38
                for tx, ty, tr in self.trees_i1:
                    dist_tree = math.hypot(new_x - tx, new_y - ty)
                    min_dist = player_r + tr
                    if dist_tree < min_dist and dist_tree > 0.001:
                        # Empurrar para fora do tronco
                        overlap = min_dist - dist_tree
                        nx = (new_x - tx) / dist_tree
                        ny = (new_y - ty) / dist_tree
                        new_x += nx * overlap
                        new_y += ny * overlap

                # ==========================================
                # RESOLUÇÃO DE COLISÕES COM PILARES DO PORTAL
                # ==========================================
                for px, py, pr in self.portal_pillars:
                    dist_pillar = math.hypot(new_x - px, new_y - py)
                    min_dist = player_r + pr
                    if dist_pillar < min_dist and dist_pillar > 0.001:
                        overlap = min_dist - dist_pillar
                        nx = (new_x - px) / dist_pillar
                        ny = (new_y - py) / dist_pillar
                        new_x += nx * overlap
                        new_y += ny * overlap

                loc.x = new_x
                loc.y = new_y

                target_rot = math.atan2(move_y, move_x) - math.radians(90)
                self.player.rotation_euler.z = target_rot

            # ==========================================
            # EVENTO DE TELETRANSPORTE DO PORTAL MÍSTICO
            # ==========================================
            if self.warp_cooldown <= 0:
                # Portal 1 (Ilha 1 -> Ilha Celestial 2)
                if abs(loc.x) < 1.4 and 2.9 <= loc.y <= 3.8 and loc.z >= 2.4:
                    loc.x = 0.0
                    loc.y = 56.0
                    loc.z = 7.2
                    self.vel_z = 0.0
                    self.cam_yaw = math.radians(180) # Olhando direto para a Ponte Celestial
                    self.warp_cooldown = 2.5
                    self.report({'INFO'}, "✨ PORTAL ATRAVESSADO! BEM-VINDO À PONTE CELESTIAL! ✨")
                    print("[*] Teletransporte ativado: Ilha 1 -> Ilha Celestial 2!")

                # Portal 2 (Ilha Celestial 2 -> Ilha 1)
                elif abs(loc.x) < 1.4 and 51.2 <= loc.y <= 52.8 and loc.z >= 6.8:
                    loc.x = 0.0
                    loc.y = 1.8
                    loc.z = 2.15
                    self.vel_z = 0.0
                    self.cam_yaw = math.radians(0)
                    self.warp_cooldown = 2.5
                    self.report({'INFO'}, "🌀 RETORNANDO À ILHA FLUTUANTE INICIAL! 🌀")
                    print("[*] Teletransporte ativado: Ilha Celestial 2 -> Ilha 1!")

            # ==========================================
            # DETECÇÃO DO SOLO E PLATAFORMAS (GROUND Z)
            # ==========================================
            ground_z = -999.0
            on_solid_ground = False

            # 1. Ilha 1 (Centro 0, 0)
            dist_i1 = math.hypot(loc.x, loc.y)
            if dist_i1 <= 7.8:
                ground_z = 2.15
                on_solid_ground = True
                # Degraus do Portal 1
                dist_dais = math.hypot(loc.x, loc.y - 3.2)
                if dist_dais <= 2.0:
                    ground_z = 2.96
                elif dist_dais <= 2.7:
                    ground_z = 2.71
                elif dist_dais <= 3.4:
                    ground_z = 2.43

            # 2. Ilha 2 (Centro 0, 60.0)
            dist_i2 = math.hypot(loc.x, loc.y - 60.0)
            if dist_i2 <= 7.8:
                ground_z = 7.2
                on_solid_ground = True
                # Degraus do Portal 2
                dist_dais2 = math.hypot(loc.x, loc.y - 52.0)
                if dist_dais2 <= 2.0:
                    ground_z = 7.96
                elif dist_dais2 <= 2.7:
                    ground_z = 7.71
                elif dist_dais2 <= 3.4:
                    ground_z = 7.43

            # 3. Ponte Celestial (Y entre 67.0 e 97.0)
            if 67.0 <= loc.y <= 97.0 and abs(loc.x) <= 1.85:
                arch_norm = math.sin(((loc.y - 67.0) / 30.0) * math.pi)
                ground_z = 7.2 + arch_norm * 1.5 + 0.2
                on_solid_ground = True

            # 4. Ilha 3 - Santuário (Centro 0, 105.0)
            dist_i3 = math.hypot(loc.x, loc.y - 105.0)
            if dist_i3 <= 8.5:
                ground_z = 7.2
                on_solid_ground = True
                # Altar em degraus do Santuário
                if dist_i3 <= 1.4:
                    ground_z = 8.4
                elif dist_i3 <= 2.2:
                    ground_z = 8.0
                elif dist_i3 <= 3.2:
                    ground_z = 7.6

            # Pulo (Space)
            if 'SPACE' in self.keys and self.is_grounded:
                self.vel_z = self.jump_force
                self.is_grounded = False

            # Gravidade e Queda
            if not self.is_grounded or loc.z > ground_z:
                self.vel_z -= self.gravity * dt
                loc.z += self.vel_z * dt

            # Aterrissagem
            if on_solid_ground and loc.z <= ground_z:
                loc.z = ground_z
                self.vel_z = 0.0
                self.is_grounded = True
            elif not on_solid_ground and loc.z <= ground_z:
                self.is_grounded = False

            # Queda no Vazio / Respawn
            if loc.z < -14.0:
                if loc.y > 40.0:
                    loc.x = 0.0
                    loc.y = 56.0
                    loc.z = 7.2
                else:
                    loc.x = -2.8
                    loc.y = -4.2
                    loc.z = 2.15
                self.vel_z = 0.0
                self.is_grounded = True
                print("[!] O personagem renasceu!")

            # Câmera Orbital suave seguindo o jogador
            if self.cam:
                target_x = loc.x
                target_y = loc.y
                target_z = loc.z + 1.2

                cam_x = target_x + self.cam_dist * math.sin(self.cam_yaw) * math.cos(self.cam_pitch)
                cam_y = target_y + self.cam_dist * math.cos(self.cam_yaw) * math.cos(self.cam_pitch)
                cam_z = target_z + self.cam_dist * math.sin(self.cam_pitch)

                self.cam.location.x += (cam_x - self.cam.location.x) * 0.25
                self.cam.location.y += (cam_y - self.cam.location.y) * 0.25
                self.cam.location.z += (cam_z - self.cam.location.z) * 0.25

                cam_vec = mathutils.Vector(self.cam.location)
                target_vec = mathutils.Vector((target_x, target_y, target_z))
                look_dir = target_vec - cam_vec
                rot_quat = look_dir.to_track_quat('-Z', 'Y')
                self.cam.rotation_euler = rot_quat.to_euler()

            for area in context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()

        return {'PASS_THROUGH'}

    def cleanup(self, context):
        if self.timer:
            context.window_manager.event_timer_remove(self.timer)
            self.timer = None

class GAME_PT_PlayPanel(bpy.types.Panel):
    bl_label = "🎮 Jogar no Reino Celestial"
    bl_idname = "GAME_PT_PlayPanel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'MCP for Blender'

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.scale_y = 1.6
        col.operator("game.play_island", text="Iniciar Jogo (WASD + Mouse)", icon='PLAY')
        layout.label(text="W, A, S, D: Andar na direção da câmera", icon='FORWARD')
        layout.label(text="SPACE: Pular", icon='MOD_PHYSICS')
        layout.label(text="Arraste com o Mouse: Girar Câmera 360°", icon='ORIENTATION_GIMBAL')
        layout.label(text="Entre no Portal para ir à Ponte Celestial!", icon='WORLD')
        layout.label(text="ESC: Sair do Jogo", icon='CANCEL')

def register():
    try:
        bpy.utils.unregister_class(GAME_OT_PlayFloatingIsland)
        bpy.utils.unregister_class(GAME_PT_PlayPanel)
    except Exception:
        pass
    bpy.utils.register_class(GAME_OT_PlayFloatingIsland)
    bpy.utils.register_class(GAME_PT_PlayPanel)

if __name__ == "__main__":
    register()
    print("[+] Controlador de jogo v5 com colisoes e portal registrado com sucesso no Blender!")
'''

def main():
    text_block = bpy.data.texts.get("game_controller.py")
    if not text_block:
        text_block = bpy.data.texts.new("game_controller.py")
    text_block.clear()
    text_block.write(CONTROLLER_SCRIPT)

    exec(CONTROLLER_SCRIPT, globals())

    blend_path = r"d:\Users\Home\Documents\repos\playful-hub-sandbox\blender_game\models\floating_island.blend"
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[+] Arquivo {blend_path} atualizado com fisica de colisao e portal!")

if __name__ == "__main__":
    main()
