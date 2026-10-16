"""
ARGONIA: Crown of the Spire — Blender Procedural 3D Asset Studio
Generates stylized, high-fidelity low-poly 3D models with PBR materials for 4 Monarch Heroes and 5 Act Bosses.
Exports compressed GLB assets to public/models/
"""

import bpy
import math
import os

OUT_DIR = os.path.join(os.getcwd(), "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in bpy.data.collections:
        bpy.data.collections.remove(col)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)

def make_mat(name, color, metallic=0.2, roughness=0.45, emissive=(0, 0, 0, 1), emissive_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emissive
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return mat

def add_box(name, size=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new(name="Bevel", type='BEVEL')
        mod.width = bevel
        mod.segments = 2
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_cylinder(name, radius=0.5, depth=1.0, vertices=16, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_cone(name, radius1=0.5, radius2=0.0, depth=1.0, vertices=16, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=radius2, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_sphere(name, radius=0.5, segments=16, ring_count=12, loc=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=ring_count, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def add_torus(name, major_radius=1.0, minor_radius=0.1, major_segments=24, minor_segments=12, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, major_segments=major_segments, minor_segments=minor_segments, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def join_all_and_center():
    bpy.ops.object.select_all(action='SELECT')
    if len(bpy.context.selected_objects) > 1:
        bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
        bpy.ops.object.join()
    obj = bpy.context.active_object
    return obj

def export_glb(filename):
    filepath = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False
    )
    print(f"Exported: {filepath} ({os.path.getsize(filepath):,} bytes)")

# =============================================================================
# 1. HERO 1: ARTHURLA (The Sun Monarch on Royal Warhorse)
# =============================================================================
def build_hero_arthuria():
    reset_scene()
    gold_mat = make_mat("GoldArmor", (0.95, 0.76, 0.22, 1.0), metallic=0.85, roughness=0.25, emissive=(0.95, 0.76, 0.22, 1.0), emissive_strength=0.35)
    plate_mat = make_mat("SilverPlate", (0.88, 0.90, 0.94, 1.0), metallic=0.75, roughness=0.3)
    cape_mat = make_mat("CrimsonCape", (0.82, 0.12, 0.15, 1.0), metallic=0.1, roughness=0.6)
    horse_mat = make_mat("WhiteSteed", (0.95, 0.94, 0.92, 1.0), metallic=0.05, roughness=0.55)
    leather_mat = make_mat("BrownLeather", (0.35, 0.22, 0.14, 1.0), metallic=0.1, roughness=0.65)
    dark_iron = make_mat("DarkIron", (0.15, 0.17, 0.22, 1.0), metallic=0.6, roughness=0.4)

    # --- Horse ---
    # Torso
    add_cylinder("HorseTorso", radius=0.48, depth=1.65, vertices=16, loc=(0, 0.05, 1.05), rot=(math.radians(90), 0, 0), mat=horse_mat)
    # Horse Chest & Flank
    add_sphere("HorseChest", radius=0.49, loc=(0, 0.65, 1.08), mat=horse_mat)
    add_sphere("HorseFlank", radius=0.47, loc=(0, -0.65, 1.05), mat=horse_mat)
    # 4 Legs with armor
    for lx, ly in [(-0.35, 0.62), (0.35, 0.62), (-0.35, -0.6), (0.35, -0.6)]:
        add_cylinder("HorseLegUpper", radius=0.12, depth=0.65, loc=(lx, ly, 0.65), mat=horse_mat)
        add_cylinder("HorseLegLower", radius=0.09, depth=0.55, loc=(lx, ly, 0.26), mat=horse_mat)
        add_cylinder("HorseHoof", radius=0.11, depth=0.12, loc=(lx, ly, 0.06), mat=gold_mat)
    # Neck & Head
    add_cylinder("HorseNeck", radius=0.28, depth=0.9, loc=(0, 0.88, 1.55), rot=(math.radians(35), 0, 0), mat=horse_mat)
    add_box("HorseHead", size=(0.32, 0.65, 0.38), loc=(0, 1.15, 1.88), rot=(math.radians(-25), 0, 0), mat=horse_mat, bevel=0.06)
    add_box("HorseChamfron", size=(0.28, 0.42, 0.1), loc=(0, 1.25, 1.95), rot=(math.radians(-25), 0, 0), mat=gold_mat)
    # Ears & Mane
    add_cone("EarL", radius1=0.06, depth=0.22, loc=(-0.12, 0.95, 2.15), rot=(0, 0, 0), mat=horse_mat)
    add_cone("EarR", radius1=0.06, depth=0.22, loc=(0.12, 0.95, 2.15), rot=(0, 0, 0), mat=horse_mat)
    add_box("Mane", size=(0.12, 0.75, 0.25), loc=(0, 0.75, 1.7), rot=(math.radians(35), 0, 0), mat=gold_mat)
    # Saddle & Barding
    add_box("Saddle", size=(0.75, 0.65, 0.15), loc=(0, 0.05, 1.48), mat=leather_mat, bevel=0.04)
    add_box("BardingFront", size=(0.72, 0.35, 0.45), loc=(0, 0.65, 1.05), mat=gold_mat)

    # --- Monarch Arthuria ---
    # Torso
    add_box("HeroTorso", size=(0.55, 0.38, 0.65), loc=(0, 0.05, 1.95), mat=gold_mat, bevel=0.05)
    # Armor Pauldrons
    add_sphere("PauldronL", radius=0.24, loc=(-0.38, 0.05, 2.2), mat=gold_mat)
    add_sphere("PauldronR", radius=0.24, loc=(0.38, 0.05, 2.2), mat=gold_mat)
    # Head & Crown
    add_sphere("HeroHead", radius=0.22, loc=(0, 0.06, 2.45), mat=plate_mat)
    add_cylinder("Crown", radius=0.25, depth=0.18, vertices=8, loc=(0, 0.06, 2.62), mat=gold_mat)
    # Flowing Cape
    add_box("Cape", size=(0.65, 0.12, 1.1), loc=(0, -0.42, 1.85), rot=(math.radians(-22), 0, 0), mat=cape_mat)
    # Right Arm wielding Greatsword
    add_cylinder("ArmR", radius=0.1, depth=0.55, loc=(0.42, 0.22, 2.05), rot=(math.radians(45), 0, 0), mat=plate_mat)
    # Excalibur / Greatsword of Dawn
    add_cylinder("SwordHilt", radius=0.04, depth=0.45, loc=(0.42, 0.48, 2.3), rot=(math.radians(45), 0, 0), mat=leather_mat)
    add_box("SwordCrossguard", size=(0.48, 0.08, 0.08), loc=(0.42, 0.65, 2.45), rot=(math.radians(45), 0, 0), mat=gold_mat)
    add_box("SwordBlade", size=(0.14, 0.04, 1.45), loc=(0.42, 1.15, 2.95), rot=(math.radians(45), 0, 0), mat=plate_mat)
    add_box("SwordFuller", size=(0.04, 0.05, 1.25), loc=(0.42, 1.15, 2.95), rot=(math.radians(45), 0, 0), mat=gold_mat)

    join_all_and_center()
    export_glb("hero_arthuria.glb")

# =============================================================================
# 2. HERO 2: KAELEN (The Arcane Rail-Mechanist)
# =============================================================================
def build_hero_kaelen():
    reset_scene()
    arcane_cyan = make_mat("ArcaneCyan", (0.22, 0.74, 0.95, 1.0), metallic=0.4, roughness=0.2, emissive=(0.22, 0.74, 0.95, 1.0), emissive_strength=1.2)
    dark_slate = make_mat("DarkSlate", (0.12, 0.14, 0.20, 1.0), metallic=0.7, roughness=0.35)
    gold_trim = make_mat("BrassTrim", (0.88, 0.72, 0.35, 1.0), metallic=0.8, roughness=0.28)
    crystal_core = make_mat("CrystalCore", (0.45, 0.85, 1.0, 1.0), metallic=0.1, roughness=0.1, emissive=(0.45, 0.85, 1.0, 1.0), emissive_strength=1.8)

    # --- Hover Chassis ---
    add_cylinder("HoverBase", radius=0.85, depth=0.22, vertices=24, loc=(0, 0, 0.45), mat=dark_slate)
    add_torus("HoverRim", major_radius=0.92, minor_radius=0.08, major_segments=32, loc=(0, 0, 0.45), mat=gold_trim)
    add_torus("EnergyRing1", major_radius=1.15, minor_radius=0.04, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(12), math.radians(20), 0), mat=arcane_cyan)
    add_torus("EnergyRing2", major_radius=1.28, minor_radius=0.04, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(-15), math.radians(-25), 0), mat=arcane_cyan)
    for ang in [0, 120, 240]:
        rad = math.radians(ang)
        add_cylinder(f"Thruster_{ang}", radius=0.16, depth=0.35, loc=(math.cos(rad)*0.65, math.sin(rad)*0.65, 0.28), mat=dark_slate)
        add_sphere(f"ThrusterGlow_{ang}", radius=0.12, loc=(math.cos(rad)*0.65, math.sin(rad)*0.65, 0.14), mat=arcane_cyan)

    # --- Kaelen Figure ---
    add_cylinder("Robes", radius=0.42, depth=0.95, vertices=16, loc=(0, 0, 1.05), mat=dark_slate)
    add_box("ChestArmor", size=(0.48, 0.35, 0.55), loc=(0, 0, 1.65), mat=gold_trim, bevel=0.05)
    add_sphere("CoreGem", radius=0.14, loc=(0, 0.20, 1.68), mat=crystal_core)
    add_sphere("PauldronL", radius=0.22, loc=(-0.35, 0, 1.85), mat=gold_trim)
    add_sphere("PauldronR", radius=0.22, loc=(0.35, 0, 1.85), mat=gold_trim)
    add_sphere("Head", radius=0.20, loc=(0, 0, 2.15), mat=dark_slate)
    add_box("Visor", size=(0.28, 0.12, 0.08), loc=(0, 0.18, 2.18), mat=arcane_cyan)

    # --- Arcane Railstaff ---
    add_cylinder("StaffShaft", radius=0.05, depth=2.45, loc=(0.55, 0.25, 1.65), rot=(math.radians(10), 0, 0), mat=dark_slate)
    add_box("StaffRingTop", size=(0.35, 0.08, 0.35), loc=(0.55, 0.45, 2.75), mat=gold_trim)
    add_cone("StaffProngL", radius1=0.08, depth=0.45, loc=(0.42, 0.45, 3.0), mat=gold_trim)
    add_cone("StaffProngR", radius1=0.08, depth=0.45, loc=(0.68, 0.45, 3.0), mat=gold_trim)
    add_sphere("StaffCrystal", radius=0.16, loc=(0.55, 0.45, 2.95), mat=crystal_core)

    join_all_and_center()
    export_glb("hero_kaelen.glb")

# =============================================================================
# 3. HERO 3: SYLVANIS (The Astral Ranger on Great Stag)
# =============================================================================
def build_hero_sylvanis():
    reset_scene()
    emerald_mat = make_mat("EmeraldCloak", (0.12, 0.58, 0.32, 1.0), metallic=0.2, roughness=0.55)
    silver_stag = make_mat("AstralStag", (0.85, 0.90, 0.95, 1.0), metallic=0.35, roughness=0.35)
    silver_antler = make_mat("SilverAntler", (0.92, 0.95, 1.0, 1.0), metallic=0.8, roughness=0.25, emissive=(0.6, 0.85, 1.0, 1.0), emissive_strength=0.5)
    bow_wood = make_mat("BowSilver", (0.75, 0.80, 0.85, 1.0), metallic=0.7, roughness=0.3)

    # --- Stag Body ---
    add_cylinder("StagTorso", radius=0.42, depth=1.55, loc=(0, 0, 1.1), rot=(math.radians(90), 0, 0), mat=silver_stag)
    add_sphere("StagChest", radius=0.44, loc=(0, 0.6, 1.15), mat=silver_stag)
    add_sphere("StagFlank", radius=0.40, loc=(0, -0.6, 1.1), mat=silver_stag)
    for lx, ly in [(-0.32, 0.55), (0.32, 0.55), (-0.32, -0.55), (0.32, -0.55)]:
        add_cylinder("StagLeg", radius=0.08, depth=1.1, loc=(lx, ly, 0.55), mat=silver_stag)
        add_cylinder("StagHoof", radius=0.09, depth=0.12, loc=(lx, ly, 0.06), mat=silver_antler)
    add_cylinder("StagNeck", radius=0.22, depth=0.95, loc=(0, 0.75, 1.65), rot=(math.radians(30), 0, 0), mat=silver_stag)
    add_box("StagHead", size=(0.28, 0.55, 0.32), loc=(0, 1.05, 2.05), rot=(math.radians(-20), 0, 0), mat=silver_stag, bevel=0.05)

    # Sprawling Branching Antlers
    for s in [-1, 1]:
        add_cone(f"AntlerMain_{s}", radius1=0.07, depth=0.85, loc=(s * 0.22, 1.0, 2.5), rot=(math.radians(-15), s * math.radians(35), s * math.radians(25)), mat=silver_antler)
        add_cone(f"AntlerTine1_{s}", radius1=0.05, depth=0.45, loc=(s * 0.35, 1.05, 2.65), rot=(math.radians(20), s * math.radians(45), 0), mat=silver_antler)
        add_cone(f"AntlerTine2_{s}", radius1=0.04, depth=0.38, loc=(s * 0.42, 0.95, 2.85), rot=(math.radians(-30), s * math.radians(25), 0), mat=silver_antler)

    # --- Sylvanis ---
    add_box("RangerTorso", size=(0.48, 0.35, 0.62), loc=(0, 0, 1.95), mat=emerald_mat, bevel=0.05)
    add_sphere("RangerHead", radius=0.20, loc=(0, 0, 2.45), mat=silver_stag)
    add_cone("RangerHood", radius1=0.28, depth=0.45, loc=(0, -0.08, 2.62), rot=(math.radians(-20), 0, 0), mat=emerald_mat)

    # Astral Longbow
    add_torus("BowArc", major_radius=0.95, minor_radius=0.05, major_segments=24, loc=(0.45, 0.35, 2.15), rot=(0, math.radians(90), 0), mat=bow_wood)

    join_all_and_center()
    export_glb("hero_sylvanis.glb")

# =============================================================================
# 4. HERO 4: VESPERA (The Void Sovereign)
# =============================================================================
def build_hero_vespera():
    reset_scene()
    void_purple = make_mat("VoidPurple", (0.58, 0.18, 0.85, 1.0), metallic=0.5, roughness=0.3, emissive=(0.58, 0.18, 0.85, 1.0), emissive_strength=1.4)
    abyssal_dark = make_mat("AbyssalDark", (0.08, 0.06, 0.12, 1.0), metallic=0.7, roughness=0.35)
    silver_trim = make_mat("SilverTrim", (0.85, 0.85, 0.92, 1.0), metallic=0.85, roughness=0.25)

    # Floating Crescent Dais
    add_torus("CrescentMoon", major_radius=1.1, minor_radius=0.22, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(90), 0, 0), mat=abyssal_dark)
    add_sphere("DaisGem1", radius=0.15, loc=(-0.95, 0, 0.85), mat=void_purple)
    add_sphere("DaisGem2", radius=0.15, loc=(0.95, 0, 0.85), mat=void_purple)

    # Vespera Figure
    add_cylinder("VoidDress", radius=0.45, depth=1.1, vertices=16, loc=(0, 0, 1.15), mat=abyssal_dark)
    add_box("Torso", size=(0.45, 0.32, 0.55), loc=(0, 0, 1.75), mat=abyssal_dark, bevel=0.05)
    add_sphere("Head", radius=0.19, loc=(0, 0, 2.22), mat=silver_trim)
    add_box("AstralCrown", size=(0.35, 0.35, 0.12), loc=(0, 0, 2.38), rot=(0, 0, math.radians(45)), mat=void_purple)

    # Massive Void War Scythe
    add_cylinder("ScytheStaff", radius=0.045, depth=2.7, loc=(0.55, 0.25, 1.7), rot=(math.radians(20), 0, math.radians(-15)), mat=abyssal_dark)
    add_torus("ScytheBladeArc", major_radius=0.75, minor_radius=0.08, major_segments=24, loc=(0.75, 0.45, 2.85), rot=(math.radians(90), 0, math.radians(45)), mat=void_purple)

    join_all_and_center()
    export_glb("hero_vespera.glb")

# =============================================================================
# 5. BOSS 1: KRAG'ASHA (Steel Siege Juggernaut Colossus)
# =============================================================================
def build_boss_kragasha():
    reset_scene()
    iron_plate = make_mat("IronPlate", (0.28, 0.30, 0.36, 1.0), metallic=0.85, roughness=0.35)
    furnace_glow = make_mat("FurnaceGlow", (1.0, 0.35, 0.08, 1.0), metallic=0.1, roughness=0.2, emissive=(1.0, 0.35, 0.08, 1.0), emissive_strength=2.2)
    dark_steel = make_mat("DarkSteel", (0.14, 0.15, 0.18, 1.0), metallic=0.75, roughness=0.45)

    # Massive Torso & Core Furnace
    add_box("ColossusTorso", size=(1.8, 1.3, 1.7), loc=(0, 0, 2.35), mat=iron_plate, bevel=0.15)
    add_sphere("FurnaceCore", radius=0.48, loc=(0, 0.65, 2.35), mat=furnace_glow)
    add_box("Grate1", size=(0.75, 0.1, 0.08), loc=(0, 0.72, 2.45), mat=dark_steel)
    add_box("Grate2", size=(0.75, 0.1, 0.08), loc=(0, 0.72, 2.25), mat=dark_steel)

    # Heavy Pillar Legs
    for lx in [-0.62, 0.62]:
        add_box(f"Leg_{lx}", size=(0.55, 0.65, 1.6), loc=(lx, 0, 0.8), mat=dark_steel, bevel=0.08)
        add_box(f"SpikePlate_{lx}", size=(0.62, 0.35, 0.45), loc=(lx, 0.35, 0.85), mat=iron_plate)

    # Massive Spiked Pauldrons
    for px in [-1.25, 1.25]:
        add_box(f"Pauldron_{px}", size=(0.85, 0.95, 0.75), loc=(px, 0, 3.1), mat=iron_plate, bevel=0.1)
        add_cone(f"PauldronSpike_{px}", radius1=0.18, depth=0.85, loc=(px, 0, 3.75), mat=dark_steel)

    # Armored Head & Horns
    add_box("ColossusHead", size=(0.65, 0.65, 0.65), loc=(0, 0.2, 3.4), mat=iron_plate, bevel=0.08)
    add_box("VisorSlit", size=(0.55, 0.12, 0.12), loc=(0, 0.52, 3.42), mat=furnace_glow)
    add_cone("HornL", radius1=0.16, depth=0.95, loc=(-0.45, 0.2, 3.9), rot=(0, 0, math.radians(35)), mat=dark_steel)
    add_cone("HornR", radius1=0.16, depth=0.95, loc=(0.45, 0.2, 3.9), rot=(0, 0, math.radians(-35)), mat=dark_steel)

    # Great Siege Maul in Right Hand
    add_cylinder("HammerShaft", radius=0.12, depth=3.8, loc=(1.65, 0.45, 2.2), rot=(math.radians(25), 0, 0), mat=dark_steel)
    add_box("HammerHead", size=(0.95, 1.25, 0.95), loc=(1.65, 1.15, 3.7), rot=(math.radians(25), 0, 0), mat=iron_plate, bevel=0.1)

    join_all_and_center()
    export_glb("boss_kragasha.glb")

# =============================================================================
# 6. BOSS 2: BOREALIS (The Glacial Frost Wyrm)
# =============================================================================
def build_boss_borealis():
    reset_scene()
    glacial_ice = make_mat("GlacialIce", (0.55, 0.85, 0.98, 1.0), metallic=0.3, roughness=0.15, emissive=(0.45, 0.85, 1.0, 1.0), emissive_strength=1.5)
    frost_scales = make_mat("FrostScales", (0.82, 0.92, 0.98, 1.0), metallic=0.65, roughness=0.3)
    rime_dark = make_mat("RimeDark", (0.18, 0.28, 0.45, 1.0), metallic=0.5, roughness=0.45)

    # Serpentine Dragon Body (Hovering)
    add_cylinder("WyrmChest", radius=0.85, depth=1.85, loc=(0, 0, 2.6), rot=(math.radians(70), 0, 0), mat=frost_scales)
    add_cylinder("WyrmAbdomen", radius=0.68, depth=2.1, loc=(0, -1.2, 2.2), rot=(math.radians(45), 0, 0), mat=frost_scales)
    add_cylinder("WyrmTail", radius=0.42, depth=2.4, loc=(0, -2.6, 1.8), rot=(math.radians(25), 0, 0), mat=frost_scales)

    # Crystalline Spine Ridges
    for z_off, y_off in [(2.9, 0.4), (2.5, -0.6), (2.1, -1.6), (1.8, -2.4)]:
        add_cone("SpineCrystal", radius1=0.22, depth=0.85, loc=(0, y_off, z_off), mat=glacial_ice)

    # Dragon Neck & Head
    add_cylinder("WyrmNeck", radius=0.55, depth=1.45, loc=(0, 1.1, 3.1), rot=(math.radians(45), 0, 0), mat=frost_scales)
    add_box("WyrmHead", size=(0.75, 1.25, 0.65), loc=(0, 1.85, 3.55), rot=(math.radians(-15), 0, 0), mat=frost_scales, bevel=0.1)
    add_cone("FrostHornL", radius1=0.18, depth=1.45, loc=(-0.42, 1.6, 4.1), rot=(math.radians(-30), math.radians(25), 0), mat=glacial_ice)
    add_cone("FrostHornR", radius1=0.18, depth=1.45, loc=(0.42, 1.6, 4.1), rot=(math.radians(-30), math.radians(-25), 0), mat=glacial_ice)

    # Expansive Ice-Ribbed Dragon Wings
    for s in [-1, 1]:
        add_box(f"WingBone_{s}", size=(2.8, 0.18, 0.22), loc=(s * 1.65, 0.2, 3.2), rot=(0, s * math.radians(18), s * math.radians(25)), mat=rime_dark)
        add_box(f"WingMembrane_{s}", size=(2.7, 1.45, 0.05), loc=(s * 1.75, -0.35, 3.0), rot=(0, s * math.radians(18), s * math.radians(25)), mat=glacial_ice)

    join_all_and_center()
    export_glb("boss_borealis.glb")

# =============================================================================
# 7. BOSS 3: AKHEN-RA (The Sun Pharaoh Lich)
# =============================================================================
def build_boss_akhen_ra():
    reset_scene()
    solar_gold = make_mat("SolarGold", (0.95, 0.82, 0.25, 1.0), metallic=0.9, roughness=0.2, emissive=(0.95, 0.75, 0.15, 1.0), emissive_strength=0.8)
    pharaoh_lapis = make_mat("LapisLazuli", (0.10, 0.32, 0.75, 1.0), metallic=0.4, roughness=0.35)
    sun_disc_glow = make_mat("SunDiscGlow", (1.0, 0.88, 0.35, 1.0), metallic=0.1, roughness=0.1, emissive=(1.0, 0.88, 0.35, 1.0), emissive_strength=2.5)

    # Floating Sarcophagus Robes
    add_cylinder("PharaohRobes", radius=0.68, depth=2.4, vertices=16, loc=(0, 0, 1.4), mat=pharaoh_lapis)
    add_box("ChestArmor", size=(0.95, 0.65, 0.95), loc=(0, 0, 2.3), mat=solar_gold, bevel=0.08)

    # Pharaoh Head & Royal Nemes Headdress
    add_sphere("Head", radius=0.32, loc=(0, 0, 3.0), mat=solar_gold)
    add_box("NemesFront", size=(0.85, 0.45, 0.65), loc=(0, -0.1, 3.15), mat=pharaoh_lapis)
    add_cylinder("NemesFlapL", radius=0.18, depth=0.85, loc=(-0.42, 0, 2.7), mat=solar_gold)
    add_cylinder("NemesFlapR", radius=0.18, depth=0.85, loc=(0.42, 0, 2.7), mat=solar_gold)

    # Floating Blazing Sun Disc Aura behind head
    add_cylinder("SunDisc", radius=1.1, depth=0.08, vertices=32, loc=(0, -0.35, 3.25), rot=(math.radians(90), 0, 0), mat=sun_disc_glow)
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        add_cone(f"SunRay_{ang}", radius1=0.12, depth=0.65, loc=(math.cos(rad)*1.35, -0.35, 3.25 + math.sin(rad)*1.35), rot=(0, 0, -rad + math.radians(90)), mat=solar_gold)

    # Ankh Sun Scepter in hand
    add_cylinder("AnkhStaff", radius=0.08, depth=3.2, loc=(0.95, 0.45, 2.1), mat=solar_gold)
    add_torus("AnkhLoop", major_radius=0.35, minor_radius=0.07, loc=(0.95, 0.45, 3.9), rot=(0, math.radians(90), 0), mat=sun_disc_glow)

    join_all_and_center()
    export_glb("boss_akhen_ra.glb")

# =============================================================================
# 8. BOSS 4: IGNIS VALKOR (The Molten Dragon Overlord)
# =============================================================================
def build_boss_ignis_valkor():
    reset_scene()
    obsidian_plate = make_mat("ObsidianPlate", (0.10, 0.08, 0.10, 1.0), metallic=0.7, roughness=0.3)
    magma_glow = make_mat("MagmaGlow", (1.0, 0.28, 0.05, 1.0), metallic=0.1, roughness=0.15, emissive=(1.0, 0.28, 0.05, 1.0), emissive_strength=2.8)

    # Colossal Bipedal Dragon Frame
    add_box("MagmaTorso", size=(1.7, 1.3, 1.8), loc=(0, 0, 2.4), mat=obsidian_plate, bevel=0.12)
    add_sphere("MoltenHeart", radius=0.55, loc=(0, 0.55, 2.4), mat=magma_glow)

    # Thick Legs
    for lx in [-0.65, 0.65]:
        add_box(f"DragonLeg_{lx}", size=(0.58, 0.75, 1.65), loc=(lx, 0, 0.85), mat=obsidian_plate, bevel=0.08)

    # Horned Dragon Head
    add_box("DragonHead", size=(0.85, 1.25, 0.75), loc=(0, 0.65, 3.5), mat=obsidian_plate, bevel=0.1)
    add_box("MawGlow", size=(0.65, 0.75, 0.18), loc=(0, 1.05, 3.35), mat=magma_glow)
    add_cone("DemonHornL", radius1=0.22, depth=1.65, loc=(-0.55, 0.35, 4.2), rot=(math.radians(-25), math.radians(35), 0), mat=obsidian_plate)
    add_cone("DemonHornR", radius1=0.22, depth=1.65, loc=(0.55, 0.35, 4.2), rot=(math.radians(-25), math.radians(-35), 0), mat=obsidian_plate)

    # Huge Magma Wings
    for s in [-1, 1]:
        add_box(f"MagmaWingBone_{s}", size=(3.2, 0.22, 0.25), loc=(s * 1.85, -0.2, 3.1), rot=(0, s * math.radians(20), s * math.radians(28)), mat=obsidian_plate)
        add_box(f"MagmaWingWeb_{s}", size=(3.1, 1.65, 0.06), loc=(s * 1.95, -0.65, 2.85), rot=(0, s * math.radians(20), s * math.radians(28)), mat=magma_glow)

    join_all_and_center()
    export_glb("boss_ignis_valkor.glb")

# =============================================================================
# 9. BOSS 5: MALAKOR (The Abyssal Void Sovereign - Final Boss)
# =============================================================================
def build_boss_malakor():
    reset_scene()
    void_dark = make_mat("VoidDark", (0.06, 0.05, 0.08, 1.0), metallic=0.8, roughness=0.25)
    abyssal_magenta = make_mat("AbyssalMagenta", (0.85, 0.15, 0.95, 1.0), metallic=0.2, roughness=0.15, emissive=(0.85, 0.15, 0.95, 1.0), emissive_strength=2.6)

    # Archdemon Torso
    add_box("MalakorTorso", size=(1.6, 1.2, 1.9), loc=(0, 0, 2.5), mat=void_dark, bevel=0.12)
    add_sphere("VoidEyeChest", radius=0.45, loc=(0, 0.55, 2.5), mat=abyssal_magenta)

    # Quad Void Wings (2 upper colossal, 2 lower)
    for s in [-1, 1]:
        add_box(f"UpperWing_{s}", size=(3.4, 0.18, 0.22), loc=(s * 1.95, -0.3, 3.4), rot=(0, s * math.radians(15), s * math.radians(35)), mat=abyssal_magenta)
        add_box(f"LowerWing_{s}", size=(2.4, 0.15, 0.18), loc=(s * 1.45, -0.3, 2.1), rot=(0, s * math.radians(15), s * math.radians(-25)), mat=abyssal_magenta)

    # Horned Demonic Crown
    add_box("Head", size=(0.75, 0.75, 0.75), loc=(0, 0.2, 3.65), mat=void_dark, bevel=0.08)
    for s in [-1, 1]:
        add_cone(f"MainHorn_{s}", radius1=0.18, depth=1.65, loc=(s * 0.45, 0.2, 4.5), rot=(math.radians(-20), s * math.radians(30), 0), mat=void_dark)
        add_cone(f"InnerHorn_{s}", radius1=0.12, depth=1.1, loc=(s * 0.22, 0.35, 4.3), rot=(math.radians(15), s * math.radians(15), 0), mat=abyssal_magenta)

    # Colossal Chaos Blade
    add_cylinder("BladeHilt", radius=0.09, depth=4.2, loc=(1.65, 0.65, 2.2), rot=(math.radians(30), 0, 0), mat=void_dark)
    add_box("ChaosBlade", size=(0.28, 0.08, 2.8), loc=(1.65, 1.65, 3.8), rot=(math.radians(30), 0, 0), mat=abyssal_magenta)

    join_all_and_center()
    export_glb("boss_malakor.glb")

# =============================================================================
# MAIN BATCH EXECUTION
# =============================================================================
if __name__ == "__main__":
    print("=== STARTING BLENDER BATCH GLB EXPORT ===")
    build_hero_arthuria()
    build_hero_kaelen()
    build_hero_sylvanis()
    build_hero_vespera()
    build_boss_kragasha()
    build_boss_borealis()
    build_boss_akhen_ra()
    build_boss_ignis_valkor()
    build_boss_malakor()
    print("=== ALL 9 GLB MODELS SUCCESSFULLY GENERATED ===")
