"""
ARGONIA: Crown of the Spire — Blender 5.2 Procedural 3D Asset Studio (Full 27-Asset Edition)
Generates stylized, multi-node hierarchical 3D models with PBR materials and separated animation pivots for:
- 4 Monarch Heroes (hero_arthuria, hero_kaelen, hero_sylvanis, hero_vespera)
- 5 Colossal Act Bosses (boss_kragasha, boss_borealis, boss_akhen_ra, boss_ignis_valkor, boss_malakor)
- 10 Kingdom Buildings (bldg_citadel, bldg_gold_mine, bldg_windmill, bldg_argon_refinery, bldg_archer_tower,
  bldg_arcane_obelisk, bldg_flame_mortar, bldg_frost_spire, bldg_barracks, bldg_stone_wall)
- 4 Enemy Archetype Models (enemy_infantry, enemy_beast, enemy_golem, enemy_flier)
- 3 Allied Garrison Troop Models (troop_swordsman, troop_paladin, troop_valkyrie)
- 1 Abyssal Rift Spawn Portal (prop_portal)

Exports GLB assets with preserved 'Anim_*' hierarchy nodes to public/models/
"""

import bpy
import math
import os

OUT_DIR = os.path.join(os.getcwd(), "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
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


def bake_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception:
            pass


def add_box(name, size=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.04, segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new(name="Bevel", type='BEVEL')
        mod.width = bevel
        mod.segments = segments
        bake_modifiers(obj)
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_cylinder(name, radius=0.5, depth=1.0, vertices=20, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.02):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if bevel > 0:
        mod = obj.modifiers.new(name="Bevel", type='BEVEL')
        mod.width = bevel
        mod.segments = 2
        bake_modifiers(obj)
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_cone(name, radius1=0.5, radius2=0.0, depth=1.0, vertices=20, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=radius2, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_sphere(name, radius=0.5, segments=20, ring_count=14, loc=(0, 0, 0), scale=(1, 1, 1), mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=ring_count, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if scale != (1, 1, 1):
        obj.scale = scale
        bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_icosphere(name, radius=0.5, subdivisions=2, loc=(0, 0, 0), scale=(1, 1, 1), mat=None, flat=False):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=radius, subdivisions=subdivisions, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if scale != (1, 1, 1):
        obj.scale = scale
        bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    if not flat:
        bpy.ops.object.shade_smooth()
    return obj


def add_torus(name, major_radius=1.0, minor_radius=0.1, major_segments=28, minor_segments=12, loc=(0, 0, 0), rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def join_into_anim_node(objs, node_name, pivot_loc):
    """Joins a list of mesh objects into a single named animation node with its origin set to pivot_loc."""
    valid = [o for o in objs if o is not None]
    if not valid:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in valid:
        o.select_set(True)
    bpy.context.view_layer.objects.active = valid[0]
    if len(valid) > 1:
        bpy.ops.object.join()
    active = bpy.context.active_object
    active.name = node_name
    bpy.context.scene.cursor.location = pivot_loc
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return active


def finalize_hierarchy_and_export(filename):
    """
    Joins all non-'Anim_' meshes into a single 'StaticBody' mesh (origin at 0,0,0)
    while preserving all 'Anim_*' nodes as independent objects with their custom origins.
    """
    bpy.ops.object.select_all(action='DESELECT')
    static_objs = [
        o for o in bpy.context.scene.objects
        if o.type == 'MESH' and not o.name.startswith("Anim_")
    ]
    if len(static_objs) > 1:
        for o in static_objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = static_objs[0]
        bpy.ops.object.join()
        body = bpy.context.active_object
        body.name = "StaticBody"
        bpy.context.scene.cursor.location = (0, 0, 0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    elif len(static_objs) == 1:
        body = static_objs[0]
        body.name = "StaticBody"
        bpy.context.view_layer.objects.active = body
        bpy.context.scene.cursor.location = (0, 0, 0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    filepath = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
    )
    print(f"Exported: {filepath} ({os.path.getsize(filepath):,} bytes)")


# =============================================================================
# PART A: 4 SOVEREIGN HEROES (WITH SEPARATED Anim_Weapon & Anim_Rotor)
# =============================================================================

def build_hero_arthuria():
    reset_scene()
    gold_mat = make_mat("GoldArmor", (0.95, 0.76, 0.22, 1.0), metallic=0.88, roughness=0.24, emissive=(0.95, 0.76, 0.22, 1.0), emissive_strength=0.35)
    plate_mat = make_mat("SilverPlate", (0.88, 0.90, 0.94, 1.0), metallic=0.78, roughness=0.28)
    cape_mat = make_mat("CrimsonCape", (0.82, 0.12, 0.15, 1.0), metallic=0.1, roughness=0.58)
    horse_mat = make_mat("WhiteSteed", (0.95, 0.94, 0.92, 1.0), metallic=0.05, roughness=0.52)
    leather_mat = make_mat("BrownLeather", (0.35, 0.22, 0.14, 1.0), metallic=0.1, roughness=0.65)
    solar_blade = make_mat("SolarBlade", (1.0, 0.92, 0.45, 1.0), metallic=0.5, roughness=0.15, emissive=(1.0, 0.78, 0.18, 1.0), emissive_strength=1.6)

    # Royal Barded Warhorse
    add_cylinder("HorseTorso", radius=0.48, depth=1.65, vertices=20, loc=(0, 0.05, 1.05), rot=(math.radians(90), 0, 0), mat=horse_mat)
    add_sphere("HorseChest", radius=0.49, loc=(0, 0.65, 1.08), mat=horse_mat)
    add_sphere("HorseFlank", radius=0.47, loc=(0, -0.65, 1.05), mat=horse_mat)
    for lx, ly in [(-0.35, 0.62), (0.35, 0.62), (-0.35, -0.6), (0.35, -0.6)]:
        add_cylinder("HorseLegUpper", radius=0.12, depth=0.65, loc=(lx, ly, 0.65), mat=horse_mat)
        add_cylinder("HorseLegLower", radius=0.09, depth=0.55, loc=(lx, ly, 0.26), mat=plate_mat)
        add_cylinder("HorseHoof", radius=0.11, depth=0.14, loc=(lx, ly, 0.07), mat=gold_mat)
    add_cylinder("HorseNeck", radius=0.28, depth=0.9, loc=(0, 0.88, 1.55), rot=(math.radians(35), 0, 0), mat=horse_mat)
    add_box("HorseHead", size=(0.32, 0.65, 0.38), loc=(0, 1.15, 1.88), rot=(math.radians(-25), 0, 0), mat=horse_mat, bevel=0.06)
    add_box("HorseChamfron", size=(0.30, 0.46, 0.12), loc=(0, 1.25, 1.96), rot=(math.radians(-25), 0, 0), mat=gold_mat, bevel=0.03)
    add_cone("HorsePlume", radius1=0.10, depth=0.42, loc=(0, 1.18, 2.25), rot=(math.radians(20), 0, 0), mat=cape_mat)
    add_cone("EarL", radius1=0.06, depth=0.22, loc=(-0.12, 0.95, 2.15), mat=horse_mat)
    add_cone("EarR", radius1=0.06, depth=0.22, loc=(0.12, 0.95, 2.15), mat=horse_mat)
    add_box("Mane", size=(0.12, 0.75, 0.25), loc=(0, 0.75, 1.7), rot=(math.radians(35), 0, 0), mat=gold_mat)
    add_cone("HorseTail", radius1=0.18, depth=0.85, loc=(0, -0.95, 0.85), rot=(math.radians(35), 0, 0), mat=horse_mat)
    add_box("Saddle", size=(0.78, 0.68, 0.18), loc=(0, 0.05, 1.48), mat=leather_mat, bevel=0.04)
    add_box("BardingFront", size=(0.76, 0.42, 0.48), loc=(0, 0.65, 1.05), mat=gold_mat, bevel=0.05)
    add_box("BardingRear", size=(0.76, 0.52, 0.44), loc=(0, -0.55, 1.05), mat=gold_mat, bevel=0.05)

    # Monarch Arthuria Body & Lion Shield
    add_box("HeroTorso", size=(0.56, 0.40, 0.68), loc=(0, 0.05, 1.95), mat=plate_mat, bevel=0.06)
    add_box("BreastplateCrest", size=(0.38, 0.12, 0.42), loc=(0, 0.22, 1.98), mat=gold_mat, bevel=0.03)
    add_sphere("PauldronL", radius=0.25, loc=(-0.38, 0.05, 2.2), mat=gold_mat)
    add_sphere("PauldronR", radius=0.25, loc=(0.38, 0.05, 2.2), mat=gold_mat)
    add_sphere("HeroHead", radius=0.22, loc=(0, 0.06, 2.45), mat=plate_mat)
    add_cylinder("Crown", radius=0.25, depth=0.20, vertices=12, loc=(0, 0.06, 2.64), mat=gold_mat)
    add_box("Cape", size=(0.68, 0.12, 1.15), loc=(0, -0.44, 1.85), rot=(math.radians(-22), 0, 0), mat=cape_mat, bevel=0.03)
    add_box("LionShield", size=(0.12, 0.52, 0.68), loc=(-0.48, 0.18, 1.95), rot=(0, 0, math.radians(-12)), mat=gold_mat, bevel=0.04)

    # Animated Excalibur Weapon Group
    w1 = add_cylinder("ArmR", radius=0.1, depth=0.55, loc=(0.42, 0.22, 2.05), rot=(math.radians(45), 0, 0), mat=plate_mat)
    w2 = add_cylinder("SwordHilt", radius=0.045, depth=0.45, loc=(0.42, 0.48, 2.3), rot=(math.radians(45), 0, 0), mat=leather_mat)
    w3 = add_box("SwordCrossguard", size=(0.52, 0.10, 0.10), loc=(0.42, 0.65, 2.45), rot=(math.radians(45), 0, 0), mat=gold_mat)
    w4 = add_box("SwordBlade", size=(0.16, 0.05, 1.55), loc=(0.42, 1.18, 2.98), rot=(math.radians(45), 0, 0), mat=solar_blade, bevel=0.02)
    join_into_anim_node([w1, w2, w3, w4], "Anim_Weapon", (0.42, 0.12, 2.05))

    finalize_hierarchy_and_export("hero_arthuria.glb")


def build_hero_kaelen():
    reset_scene()
    arcane_cyan = make_mat("ArcaneCyan", (0.22, 0.74, 0.95, 1.0), metallic=0.4, roughness=0.2, emissive=(0.22, 0.74, 0.95, 1.0), emissive_strength=1.35)
    dark_slate = make_mat("DarkSlate", (0.12, 0.14, 0.20, 1.0), metallic=0.72, roughness=0.32)
    gold_trim = make_mat("BrassTrim", (0.88, 0.72, 0.35, 1.0), metallic=0.85, roughness=0.26)
    crystal_core = make_mat("CrystalCore", (0.45, 0.85, 1.0, 1.0), metallic=0.1, roughness=0.1, emissive=(0.45, 0.85, 1.0, 1.0), emissive_strength=1.9)

    add_cylinder("HoverBase", radius=0.85, depth=0.22, vertices=24, loc=(0, 0, 0.45), mat=dark_slate)
    add_torus("HoverRim", major_radius=0.92, minor_radius=0.08, major_segments=32, loc=(0, 0, 0.45), mat=gold_trim)
    for ang in [0, 120, 240]:
        rad = math.radians(ang)
        add_cylinder(f"Thruster_{ang}", radius=0.16, depth=0.35, loc=(math.cos(rad)*0.65, math.sin(rad)*0.65, 0.28), mat=dark_slate)
        add_sphere(f"ThrusterGlow_{ang}", radius=0.12, loc=(math.cos(rad)*0.65, math.sin(rad)*0.65, 0.14), mat=arcane_cyan)

    # Rotating Gyro Rings
    r1 = add_torus("EnergyRing1", major_radius=1.15, minor_radius=0.045, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(12), math.radians(20), 0), mat=arcane_cyan)
    r2 = add_torus("EnergyRing2", major_radius=1.28, minor_radius=0.045, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(-15), math.radians(-25), 0), mat=gold_trim)
    join_into_anim_node([r1, r2], "Anim_Rotor", (0, 0, 0.55))

    # Kaelen Body
    add_cylinder("Robes", radius=0.42, depth=0.95, vertices=20, loc=(0, 0, 1.05), mat=dark_slate)
    add_box("ChestArmor", size=(0.50, 0.36, 0.56), loc=(0, 0, 1.65), mat=gold_trim, bevel=0.05)
    add_sphere("CoreGem", radius=0.15, loc=(0, 0.20, 1.68), mat=crystal_core)
    add_sphere("PauldronL", radius=0.22, loc=(-0.35, 0, 1.85), mat=gold_trim)
    add_sphere("PauldronR", radius=0.22, loc=(0.35, 0, 1.85), mat=gold_trim)
    add_sphere("Head", radius=0.20, loc=(0, 0, 2.15), mat=dark_slate)
    add_box("Visor", size=(0.28, 0.12, 0.08), loc=(0, 0.18, 2.18), mat=arcane_cyan)

    # Animated Arcane Railstaff
    w1 = add_cylinder("StaffShaft", radius=0.05, depth=2.45, loc=(0.55, 0.25, 1.65), rot=(math.radians(10), 0, 0), mat=dark_slate)
    w2 = add_box("StaffRingTop", size=(0.36, 0.09, 0.36), loc=(0.55, 0.45, 2.75), mat=gold_trim)
    w3 = add_cone("StaffProngL", radius1=0.08, depth=0.48, loc=(0.42, 0.45, 3.0), mat=gold_trim)
    w4 = add_cone("StaffProngR", radius1=0.08, depth=0.48, loc=(0.68, 0.45, 3.0), mat=gold_trim)
    w5 = add_icosphere("StaffCrystal", radius=0.18, subdivisions=2, loc=(0.55, 0.45, 2.95), mat=crystal_core)
    join_into_anim_node([w1, w2, w3, w4, w5], "Anim_Weapon", (0.55, 0.15, 1.65))

    finalize_hierarchy_and_export("hero_kaelen.glb")


def build_hero_sylvanis():
    reset_scene()
    emerald_mat = make_mat("EmeraldCloak", (0.12, 0.58, 0.32, 1.0), metallic=0.2, roughness=0.52)
    silver_stag = make_mat("AstralStag", (0.85, 0.90, 0.95, 1.0), metallic=0.35, roughness=0.35)
    silver_antler = make_mat("SilverAntler", (0.92, 0.98, 0.85, 1.0), metallic=0.75, roughness=0.22, emissive=(0.25, 0.92, 0.65, 1.0), emissive_strength=0.65)
    bow_wood = make_mat("BowGold", (0.88, 0.72, 0.32, 1.0), metallic=0.8, roughness=0.25)

    # Great White Stag
    add_cylinder("StagTorso", radius=0.42, depth=1.55, loc=(0, 0, 1.1), rot=(math.radians(90), 0, 0), mat=silver_stag)
    add_sphere("StagChest", radius=0.44, loc=(0, 0.6, 1.15), mat=silver_stag)
    add_sphere("StagFlank", radius=0.40, loc=(0, -0.6, 1.1), mat=silver_stag)
    for lx, ly in [(-0.32, 0.55), (0.32, 0.55), (-0.32, -0.55), (0.32, -0.55)]:
        add_cylinder("StagLeg", radius=0.08, depth=1.1, loc=(lx, ly, 0.55), mat=silver_stag)
        add_cylinder("StagHoof", radius=0.09, depth=0.12, loc=(lx, ly, 0.06), mat=silver_antler)
    add_cylinder("StagNeck", radius=0.22, depth=0.95, loc=(0, 0.75, 1.65), rot=(math.radians(30), 0, 0), mat=silver_stag)
    add_box("StagHead", size=(0.28, 0.55, 0.32), loc=(0, 1.05, 2.05), rot=(math.radians(-20), 0, 0), mat=silver_stag, bevel=0.05)
    for s in [-1, 1]:
        add_cone(f"AntlerMain_{s}", radius1=0.07, depth=0.85, loc=(s * 0.22, 1.0, 2.5), rot=(math.radians(-15), s * math.radians(35), s * math.radians(25)), mat=silver_antler)
        add_cone(f"AntlerTine1_{s}", radius1=0.05, depth=0.45, loc=(s * 0.35, 1.05, 2.65), rot=(math.radians(20), s * math.radians(45), 0), mat=silver_antler)
        add_cone(f"AntlerTine2_{s}", radius1=0.04, depth=0.38, loc=(s * 0.42, 0.95, 2.85), rot=(math.radians(-30), s * math.radians(25), 0), mat=silver_antler)

    # Sylvanis Ranger Body
    add_box("RangerTorso", size=(0.48, 0.35, 0.62), loc=(0, 0, 1.95), mat=emerald_mat, bevel=0.05)
    add_box("RangerCape", size=(0.56, 0.10, 0.98), loc=(0, -0.35, 1.82), rot=(math.radians(-20), 0, 0), mat=emerald_mat)
    add_sphere("RangerHead", radius=0.20, loc=(0, 0, 2.45), mat=silver_stag)
    add_cone("RangerHood", radius1=0.28, depth=0.45, loc=(0, -0.08, 2.62), rot=(math.radians(-20), 0, 0), mat=emerald_mat)

    # Animated Starlight Longbow + Glowing Arrow
    w1 = add_torus("BowArc", major_radius=0.85, minor_radius=0.055, major_segments=24, loc=(0.45, 0.35, 2.15), rot=(0, math.radians(90), 0), mat=bow_wood)
    w2 = add_cylinder("StarlightArrow", radius=0.03, depth=1.15, loc=(0.45, 0.65, 2.15), rot=(math.radians(90), 0, 0), mat=silver_antler)
    join_into_anim_node([w1, w2], "Anim_Weapon", (0.45, 0.25, 2.05))

    finalize_hierarchy_and_export("hero_sylvanis.glb")


def build_hero_vespera():
    reset_scene()
    void_purple = make_mat("VoidPurple", (0.62, 0.22, 0.92, 1.0), metallic=0.5, roughness=0.25, emissive=(0.62, 0.22, 0.92, 1.0), emissive_strength=1.5)
    abyssal_dark = make_mat("AbyssalDark", (0.10, 0.07, 0.16, 1.0), metallic=0.72, roughness=0.32)
    silver_trim = make_mat("SilverTrim", (0.88, 0.88, 0.95, 1.0), metallic=0.88, roughness=0.22)

    # Floating Crescent Dais + Rotating Halo
    add_cylinder("AstralDisc", radius=0.78, depth=0.14, vertices=24, loc=(0, 0, 0.45), mat=abyssal_dark)
    r1 = add_torus("CrescentMoon", major_radius=1.08, minor_radius=0.09, major_segments=32, loc=(0, 0, 0.55), rot=(math.radians(90), 0, 0), mat=void_purple)
    r2 = add_icosphere("DaisGem1", radius=0.16, loc=(-1.05, 0, 0.55), mat=void_purple)
    r3 = add_icosphere("DaisGem2", radius=0.16, loc=(1.05, 0, 0.55), mat=void_purple)
    join_into_anim_node([r1, r2, r3], "Anim_Rotor", (0, 0, 0.55))

    # Vespera Figure
    add_cone("VoidDress", radius1=0.52, radius2=0.22, depth=1.25, vertices=20, loc=(0, 0, 1.15), mat=abyssal_dark)
    add_box("Torso", size=(0.45, 0.32, 0.55), loc=(0, 0, 1.75), mat=abyssal_dark, bevel=0.05)
    add_sphere("Head", radius=0.19, loc=(0, 0, 2.22), mat=silver_trim)
    add_torus("AstralCrown", major_radius=0.34, minor_radius=0.045, loc=(0, -0.08, 2.38), rot=(math.radians(90), 0, 0), mat=void_purple)

    # Animated Void War Scythe
    w1 = add_cylinder("ScytheStaff", radius=0.045, depth=2.65, loc=(0.55, 0.25, 1.7), rot=(math.radians(20), 0, math.radians(-12)), mat=silver_trim)
    w2 = add_cone("ScytheBlade", radius1=0.18, radius2=0.02, depth=1.25, loc=(0.68, 0.65, 2.78), rot=(math.radians(78), 0, math.radians(-10)), mat=void_purple)
    join_into_anim_node([w1, w2], "Anim_Weapon", (0.52, 0.15, 1.7))

    finalize_hierarchy_and_export("hero_vespera.glb")


# =============================================================================
# PART B: 5 COLOSSAL ACT BOSSES (WITH Anim_Weapon & Anim_Wing_L / Anim_Wing_R)
# =============================================================================

def build_boss_kragasha():
    reset_scene()
    iron_plate = make_mat("IronPlate", (0.28, 0.30, 0.36, 1.0), metallic=0.85, roughness=0.32)
    furnace_glow = make_mat("FurnaceGlow", (1.0, 0.32, 0.08, 1.0), metallic=0.1, roughness=0.2, emissive=(1.0, 0.32, 0.08, 1.0), emissive_strength=2.2)
    dark_steel = make_mat("DarkSteel", (0.14, 0.15, 0.18, 1.0), metallic=0.78, roughness=0.42)

    add_box("ColossusTorso", size=(1.82, 1.32, 1.72), loc=(0, 0, 2.35), mat=iron_plate, bevel=0.14)
    add_sphere("FurnaceCore", radius=0.50, loc=(0, 0.65, 2.35), mat=furnace_glow)
    add_box("Grate1", size=(0.78, 0.12, 0.08), loc=(0, 0.72, 2.48), mat=dark_steel)
    add_box("Grate2", size=(0.78, 0.12, 0.08), loc=(0, 0.72, 2.22), mat=dark_steel)

    for lx in [-0.62, 0.62]:
        add_box(f"Leg_{lx}", size=(0.56, 0.66, 1.62), loc=(lx, 0, 0.8), mat=dark_steel, bevel=0.08)
        add_box(f"SpikePlate_{lx}", size=(0.64, 0.36, 0.46), loc=(lx, 0.35, 0.85), mat=iron_plate, bevel=0.04)

    for px in [-1.25, 1.25]:
        add_box(f"Pauldron_{px}", size=(0.86, 0.96, 0.76), loc=(px, 0, 3.1), mat=iron_plate, bevel=0.1)
        add_cone(f"PauldronSpike_{px}", radius1=0.18, depth=0.88, loc=(px, 0, 3.75), mat=dark_steel)

    add_box("ColossusHead", size=(0.68, 0.68, 0.68), loc=(0, 0.2, 3.4), mat=iron_plate, bevel=0.08)
    add_box("VisorSlit", size=(0.56, 0.12, 0.12), loc=(0, 0.52, 3.42), mat=furnace_glow)
    add_cone("HornL", radius1=0.16, depth=0.95, loc=(-0.45, 0.2, 3.9), rot=(0, 0, math.radians(35)), mat=dark_steel)
    add_cone("HornR", radius1=0.16, depth=0.95, loc=(0.45, 0.2, 3.9), rot=(0, 0, math.radians(-35)), mat=dark_steel)

    w1 = add_cylinder("HammerShaft", radius=0.12, depth=3.8, loc=(1.65, 0.45, 2.2), rot=(math.radians(25), 0, 0), mat=dark_steel)
    w2 = add_box("HammerHead", size=(0.98, 1.28, 0.98), loc=(1.65, 1.15, 3.7), rot=(math.radians(25), 0, 0), mat=iron_plate, bevel=0.1)
    w3 = add_sphere("HammerCore", radius=0.35, loc=(1.65, 1.68, 3.95), mat=furnace_glow)
    join_into_anim_node([w1, w2, w3], "Anim_Weapon", (1.65, 0.15, 2.4))

    finalize_hierarchy_and_export("boss_kragasha.glb")


def build_boss_borealis():
    reset_scene()
    glacial_ice = make_mat("GlacialIce", (0.55, 0.85, 0.98, 1.0), metallic=0.3, roughness=0.15, emissive=(0.45, 0.85, 1.0, 1.0), emissive_strength=1.55)
    frost_scales = make_mat("FrostScales", (0.82, 0.92, 0.98, 1.0), metallic=0.65, roughness=0.28)
    rime_dark = make_mat("RimeDark", (0.18, 0.28, 0.45, 1.0), metallic=0.5, roughness=0.42)

    add_cylinder("WyrmChest", radius=0.85, depth=1.85, loc=(0, 0, 2.6), rot=(math.radians(70), 0, 0), mat=frost_scales)
    add_cylinder("WyrmAbdomen", radius=0.68, depth=2.1, loc=(0, -1.2, 2.2), rot=(math.radians(45), 0, 0), mat=frost_scales)
    add_cylinder("WyrmTail", radius=0.42, depth=2.4, loc=(0, -2.6, 1.8), rot=(math.radians(25), 0, 0), mat=frost_scales)

    for z_off, y_off in [(2.9, 0.4), (2.5, -0.6), (2.1, -1.6), (1.8, -2.4)]:
        add_cone("SpineCrystal", radius1=0.22, depth=0.85, loc=(0, y_off, z_off), mat=glacial_ice)

    add_cylinder("WyrmNeck", radius=0.55, depth=1.45, loc=(0, 1.1, 3.1), rot=(math.radians(45), 0, 0), mat=frost_scales)
    add_box("WyrmHead", size=(0.75, 1.25, 0.65), loc=(0, 1.85, 3.55), rot=(math.radians(-15), 0, 0), mat=frost_scales, bevel=0.1)
    add_cone("FrostHornL", radius1=0.18, depth=1.45, loc=(-0.42, 1.6, 4.1), rot=(math.radians(-30), math.radians(25), 0), mat=glacial_ice)
    add_cone("FrostHornR", radius1=0.18, depth=1.45, loc=(0.42, 1.6, 4.1), rot=(math.radians(-30), math.radians(-25), 0), mat=glacial_ice)

    # Separated Flapping Left & Right Wings
    wl1 = add_box("WingBone_L", size=(2.8, 0.18, 0.22), loc=(-1.65, 0.2, 3.2), rot=(0, math.radians(-18), math.radians(-25)), mat=rime_dark)
    wl2 = add_box("WingMembrane_L", size=(2.7, 1.45, 0.05), loc=(-1.75, -0.35, 3.0), rot=(0, math.radians(-18), math.radians(-25)), mat=glacial_ice)
    join_into_anim_node([wl1, wl2], "Anim_Wing_L", (-0.65, 0.1, 2.8))

    wr1 = add_box("WingBone_R", size=(2.8, 0.18, 0.22), loc=(1.65, 0.2, 3.2), rot=(0, math.radians(18), math.radians(25)), mat=rime_dark)
    wr2 = add_box("WingMembrane_R", size=(2.7, 1.45, 0.05), loc=(1.75, -0.35, 3.0), rot=(0, math.radians(18), math.radians(25)), mat=glacial_ice)
    join_into_anim_node([wr1, wr2], "Anim_Wing_R", (0.65, 0.1, 2.8))

    finalize_hierarchy_and_export("boss_borealis.glb")


def build_boss_akhen_ra():
    reset_scene()
    solar_gold = make_mat("SolarGold", (0.95, 0.82, 0.25, 1.0), metallic=0.9, roughness=0.2, emissive=(0.95, 0.75, 0.15, 1.0), emissive_strength=0.8)
    pharaoh_lapis = make_mat("LapisLazuli", (0.10, 0.32, 0.75, 1.0), metallic=0.4, roughness=0.35)
    sun_disc_glow = make_mat("SunDiscGlow", (1.0, 0.88, 0.35, 1.0), metallic=0.1, roughness=0.1, emissive=(1.0, 0.88, 0.35, 1.0), emissive_strength=2.5)

    add_cylinder("PharaohRobes", radius=0.68, depth=2.4, vertices=20, loc=(0, 0, 1.4), mat=pharaoh_lapis)
    add_box("ChestArmor", size=(0.95, 0.65, 0.95), loc=(0, 0, 2.3), mat=solar_gold, bevel=0.08)
    add_sphere("Head", radius=0.32, loc=(0, 0, 3.0), mat=solar_gold)
    add_box("NemesFront", size=(0.85, 0.45, 0.65), loc=(0, -0.1, 3.15), mat=pharaoh_lapis)
    add_cylinder("NemesFlapL", radius=0.18, depth=0.85, loc=(-0.42, 0, 2.7), mat=solar_gold)
    add_cylinder("NemesFlapR", radius=0.18, depth=0.85, loc=(0.42, 0, 2.7), mat=solar_gold)

    # Rotating Sun Disc Aura
    sun_parts = [add_cylinder("SunDisc", radius=1.1, depth=0.08, vertices=32, loc=(0, -0.35, 3.25), rot=(math.radians(90), 0, 0), mat=sun_disc_glow)]
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        sun_parts.append(add_cone(f"SunRay_{ang}", radius1=0.12, depth=0.65, loc=(math.cos(rad)*1.35, -0.35, 3.25 + math.sin(rad)*1.35), rot=(0, 0, -rad + math.radians(90)), mat=solar_gold))
    join_into_anim_node(sun_parts, "Anim_Rotor", (0, -0.35, 3.25))

    # Animated Ankh Scepter
    w1 = add_cylinder("AnkhStaff", radius=0.08, depth=3.2, loc=(0.95, 0.45, 2.1), mat=solar_gold)
    w2 = add_torus("AnkhLoop", major_radius=0.35, minor_radius=0.07, loc=(0.95, 0.45, 3.9), rot=(0, math.radians(90), 0), mat=sun_disc_glow)
    join_into_anim_node([w1, w2], "Anim_Weapon", (0.95, 0.45, 2.2))

    finalize_hierarchy_and_export("boss_akhen_ra.glb")


def build_boss_ignis_valkor():
    reset_scene()
    obsidian_plate = make_mat("ObsidianPlate", (0.10, 0.08, 0.10, 1.0), metallic=0.72, roughness=0.28)
    magma_glow = make_mat("MagmaGlow", (1.0, 0.28, 0.05, 1.0), metallic=0.1, roughness=0.15, emissive=(1.0, 0.28, 0.05, 1.0), emissive_strength=2.8)

    add_box("MagmaTorso", size=(1.7, 1.3, 1.8), loc=(0, 0, 2.4), mat=obsidian_plate, bevel=0.12)
    add_sphere("MoltenHeart", radius=0.55, loc=(0, 0.55, 2.4), mat=magma_glow)

    for lx in [-0.65, 0.65]:
        add_box(f"DragonLeg_{lx}", size=(0.58, 0.75, 1.65), loc=(lx, 0, 0.85), mat=obsidian_plate, bevel=0.08)

    add_box("DragonHead", size=(0.85, 1.25, 0.75), loc=(0, 0.65, 3.5), mat=obsidian_plate, bevel=0.1)
    add_box("MawGlow", size=(0.65, 0.75, 0.18), loc=(0, 1.05, 3.35), mat=magma_glow)
    add_cone("DemonHornL", radius1=0.22, depth=1.65, loc=(-0.55, 0.35, 4.2), rot=(math.radians(-25), math.radians(35), 0), mat=obsidian_plate)
    add_cone("DemonHornR", radius1=0.22, depth=1.65, loc=(0.55, 0.35, 4.2), rot=(math.radians(-25), math.radians(-35), 0), mat=obsidian_plate)

    wl1 = add_box("MagmaWingBone_L", size=(3.2, 0.22, 0.25), loc=(-1.85, -0.2, 3.1), rot=(0, math.radians(-20), math.radians(-28)), mat=obsidian_plate)
    wl2 = add_box("MagmaWingWeb_L", size=(3.1, 1.65, 0.06), loc=(-1.95, -0.65, 2.85), rot=(0, math.radians(-20), math.radians(-28)), mat=magma_glow)
    join_into_anim_node([wl1, wl2], "Anim_Wing_L", (-0.75, -0.2, 2.8))

    wr1 = add_box("MagmaWingBone_R", size=(3.2, 0.22, 0.25), loc=(1.85, -0.2, 3.1), rot=(0, math.radians(20), math.radians(28)), mat=obsidian_plate)
    wr2 = add_box("MagmaWingWeb_R", size=(3.1, 1.65, 0.06), loc=(1.95, -0.65, 2.85), rot=(0, math.radians(20), math.radians(28)), mat=magma_glow)
    join_into_anim_node([wr1, wr2], "Anim_Wing_R", (0.75, -0.2, 2.8))

    finalize_hierarchy_and_export("boss_ignis_valkor.glb")


def build_boss_malakor():
    reset_scene()
    void_dark = make_mat("VoidDark", (0.06, 0.05, 0.08, 1.0), metallic=0.82, roughness=0.24)
    abyssal_magenta = make_mat("AbyssalMagenta", (0.85, 0.15, 0.95, 1.0), metallic=0.2, roughness=0.15, emissive=(0.85, 0.15, 0.95, 1.0), emissive_strength=2.6)

    add_box("MalakorTorso", size=(1.6, 1.2, 1.9), loc=(0, 0, 2.5), mat=void_dark, bevel=0.12)
    add_sphere("VoidEyeChest", radius=0.45, loc=(0, 0.55, 2.5), mat=abyssal_magenta)

    for lx in [-0.58, 0.58]:
        add_box(f"VoidLeg_{lx}", size=(0.52, 0.65, 1.6), loc=(lx, 0, 0.8), mat=void_dark, bevel=0.08)

    add_box("Head", size=(0.75, 0.75, 0.75), loc=(0, 0.2, 3.65), mat=void_dark, bevel=0.08)
    for s in [-1, 1]:
        add_cone(f"MainHorn_{s}", radius1=0.18, depth=1.65, loc=(s * 0.45, 0.2, 4.5), rot=(math.radians(-20), s * math.radians(30), 0), mat=void_dark)
        add_cone(f"InnerHorn_{s}", radius1=0.12, depth=1.1, loc=(s * 0.22, 0.35, 4.3), rot=(math.radians(15), s * math.radians(15), 0), mat=abyssal_magenta)

    wl1 = add_box("UpperWing_L", size=(3.4, 0.18, 0.22), loc=(-1.95, -0.3, 3.4), rot=(0, math.radians(-15), math.radians(-35)), mat=abyssal_magenta)
    wl2 = add_box("LowerWing_L", size=(2.4, 0.15, 0.18), loc=(-1.45, -0.3, 2.1), rot=(0, math.radians(-15), math.radians(25)), mat=abyssal_magenta)
    join_into_anim_node([wl1, wl2], "Anim_Wing_L", (-0.75, -0.3, 2.8))

    wr1 = add_box("UpperWing_R", size=(3.4, 0.18, 0.22), loc=(1.95, -0.3, 3.4), rot=(0, math.radians(15), math.radians(35)), mat=abyssal_magenta)
    wr2 = add_box("LowerWing_R", size=(2.4, 0.15, 0.18), loc=(1.45, -0.3, 2.1), rot=(0, math.radians(15), math.radians(-25)), mat=abyssal_magenta)
    join_into_anim_node([wr1, wr2], "Anim_Wing_R", (0.75, -0.3, 2.8))

    w1 = add_cylinder("BladeHilt", radius=0.09, depth=4.2, loc=(1.65, 0.65, 2.2), rot=(math.radians(30), 0, 0), mat=void_dark)
    w2 = add_box("ChaosBlade", size=(0.30, 0.09, 2.8), loc=(1.65, 1.65, 3.8), rot=(math.radians(30), 0, 0), mat=abyssal_magenta, bevel=0.03)
    join_into_anim_node([w1, w2], "Anim_Weapon", (1.65, 0.25, 2.2))

    finalize_hierarchy_and_export("boss_malakor.glb")


# =============================================================================
# PART C: 10 KINGDOM BUILDINGS (ARCHITECTURAL GLB MODELS WITH ANIMATION NODES)
# =============================================================================

def get_building_mats():
    return {
        "stone_light": make_mat("StoneLight", (0.78, 0.82, 0.88, 1.0), metallic=0.12, roughness=0.68),
        "stone_dark": make_mat("StoneDark", (0.36, 0.40, 0.48, 1.0), metallic=0.18, roughness=0.75),
        "wood": make_mat("TimberWood", (0.45, 0.24, 0.10, 1.0), metallic=0.08, roughness=0.72),
        "roof_royal": make_mat("RoofRoyal", (0.12, 0.32, 0.78, 1.0), metallic=0.28, roughness=0.45),
        "roof_crimson": make_mat("RoofCrimson", (0.72, 0.14, 0.16, 1.0), metallic=0.22, roughness=0.50),
        "gold": make_mat("RoyalGold", (0.95, 0.72, 0.18, 1.0), metallic=0.86, roughness=0.25, emissive=(0.75, 0.45, 0.05, 1.0), emissive_strength=0.35),
        "argon": make_mat("ArgonCrystal", (0.22, 0.74, 0.98, 1.0), metallic=0.25, roughness=0.15, emissive=(0.12, 0.62, 0.95, 1.0), emissive_strength=1.45),
        "fire": make_mat("MagmaFire", (0.98, 0.45, 0.12, 1.0), metallic=0.15, roughness=0.2, emissive=(0.95, 0.35, 0.05, 1.0), emissive_strength=1.6),
        "frost": make_mat("GlacialFrost", (0.48, 0.84, 0.98, 1.0), metallic=0.35, roughness=0.15, emissive=(0.25, 0.72, 0.98, 1.0), emissive_strength=1.3),
        "arcane": make_mat("ArcaneViolet", (0.75, 0.42, 0.98, 1.0), metallic=0.35, roughness=0.18, emissive=(0.58, 0.20, 0.92, 1.0), emissive_strength=1.5),
        "iron": make_mat("DwarvenIron", (0.20, 0.24, 0.30, 1.0), metallic=0.78, roughness=0.38),
        "sail": make_mat("CanvasSail", (0.98, 0.95, 0.82, 1.0), metallic=0.05, roughness=0.60),
    }


def build_bldg_citadel():
    reset_scene()
    m = get_building_mats()
    # Stepped Octagonal Foundation & Keep Fortress
    add_cylinder("PlinthBase", radius=2.45, depth=0.7, vertices=16, loc=(0, 0, 0.35), mat=m["stone_dark"])
    add_box("KeepHall", size=(2.5, 2.5, 1.85), loc=(0, 0, 1.45), mat=m["stone_light"], bevel=0.08)
    add_box("GateHouse", size=(1.1, 0.55, 1.15), loc=(0, 1.35, 0.95), mat=m["stone_dark"], bevel=0.05)
    add_box("GrandDoor", size=(0.62, 0.15, 0.82), loc=(0, 1.62, 0.78), mat=m["gold"], bevel=0.03)

    for cx, cy in [(-1.25, -1.25), (1.25, -1.25), (-1.25, 1.25), (1.25, 1.25)]:
        add_cylinder(f"Bastion_{cx}_{cy}", radius=0.54, depth=2.3, vertices=16, loc=(cx, cy, 1.45), mat=m["stone_light"])
        add_cone(f"BastionRoof_{cx}_{cy}", radius1=0.68, depth=0.92, vertices=16, loc=(cx, cy, 3.0), mat=m["roof_royal"])
        add_icosphere(f"BastionFinial_{cx}_{cy}", radius=0.16, loc=(cx, cy, 3.55), mat=m["gold"])

    # Central Sovereign Spire
    add_cylinder("CentralSpire", radius=0.96, depth=3.2, vertices=20, loc=(0, 0, 2.95), mat=m["stone_light"])
    add_cone("SpireRoof", radius1=1.22, depth=1.55, vertices=20, loc=(0, 0, 5.15), mat=m["roof_royal"])

    # Floating Crown Crystal & Orbiting Halo
    fl = add_icosphere("CrownCrystal", radius=0.52, subdivisions=2, loc=(0, 0, 6.45), scale=(0.9, 0.9, 1.5), mat=m["argon"])
    join_into_anim_node([fl], "Anim_Floater", (0, 0, 6.45))

    rt = add_torus("CrownHalo", major_radius=0.98, minor_radius=0.08, loc=(0, 0, 6.45), rot=(math.radians(22), 0, 0), mat=m["gold"])
    join_into_anim_node([rt], "Anim_Rotor", (0, 0, 6.45))

    finalize_hierarchy_and_export("bldg_citadel.glb")


def build_bldg_gold_mine():
    reset_scene()
    m = get_building_mats()
    add_icosphere("QuarryMound", radius=1.25, subdivisions=2, loc=(0, -0.15, 0.68), scale=(1.1, 1.0, 0.82), mat=m["stone_dark"])
    add_box("TunnelBeamL", size=(0.18, 0.22, 1.15), loc=(-0.45, 0.65, 0.58), mat=m["wood"])
    add_box("TunnelBeamR", size=(0.18, 0.22, 1.15), loc=(0.45, 0.65, 0.58), mat=m["wood"])
    add_box("TunnelHeader", size=(1.12, 0.26, 0.20), loc=(0, 0.65, 1.12), mat=m["wood"])
    add_cylinder("SmelterChimney", radius=0.28, depth=1.85, loc=(0.68, -0.35, 1.25), mat=m["stone_dark"])
    add_torus("ChimneyRim", major_radius=0.30, minor_radius=0.06, loc=(0.68, -0.35, 2.15), mat=m["gold"])

    # Ore Cart & Rails
    add_box("OreCart", size=(0.58, 0.68, 0.38), loc=(0, 1.08, 0.34), mat=m["iron"], bevel=0.04)
    add_icosphere("CartGold", radius=0.28, loc=(0, 1.08, 0.58), mat=m["gold"])
    for nx, ny, nz in [(-0.58, 0.32, 0.72), (0.55, 0.22, 0.88), (-0.32, -0.42, 1.15)]:
        add_icosphere("GoldVein", radius=0.24, subdivisions=1, loc=(nx, ny, nz), mat=m["gold"])

    fl = add_icosphere("FloatingBullion", radius=0.34, subdivisions=1, loc=(0, -0.1, 1.88), scale=(0.9, 0.9, 1.35), mat=m["gold"])
    join_into_anim_node([fl], "Anim_Floater", (0, -0.1, 1.88))

    finalize_hierarchy_and_export("bldg_gold_mine.glb")


def build_bldg_windmill():
    reset_scene()
    m = get_building_mats()
    add_cylinder("MillBase", radius=1.08, depth=0.62, vertices=20, loc=(0, 0, 0.31), mat=m["stone_dark"])
    add_cylinder("MillTower", radius=0.78, depth=1.75, vertices=20, loc=(0, 0, 1.28), mat=m["stone_light"])
    add_cone("MillRoof", radius1=0.96, depth=0.92, vertices=20, loc=(0, 0, 2.45), mat=m["roof_crimson"])

    for i in range(6):
        ang = (i / 6.0) * math.pi * 2
        add_box(f"WheatBale_{i}", size=(0.42, 0.32, 0.26), loc=(math.cos(ang)*1.16, math.sin(ang)*1.16, 0.16), rot=(0, 0, ang), mat=m["gold"], bevel=0.04)

    # Rotating 4-Sail Hub at front (+Y in Blender, which rotates around Y axis in Blender -> Z axis in Three.js)
    # Wait: in Three.js animateBuildingMesh rotates windmillBlades.rotation.z!
    # In glTF export (Y-up), Three.js Z axis corresponds to Blender -Y axis!
    # So if we place the blades on the +Y (or -Y) face of the windmill in Blender, their rotation around Z in Three.js spins in the XY plane of Three.js!
    hub_parts = [
        add_cylinder("SailAxle", radius=0.18, depth=0.38, loc=(0, -0.85, 1.78), rot=(math.radians(90), 0, 0), mat=m["wood"])
    ]
    for b in range(4):
        ang = b * (math.pi / 2.0)
        cx = math.cos(ang) * 0.68
        cz = 1.78 + math.sin(ang) * 0.68
        hub_parts.append(add_box(f"SailSpar_{b}", size=(0.08, 0.06, 1.35), loc=(cx, -0.92, cz), rot=(0, ang, 0), mat=m["wood"], bevel=0.01))
        sx = math.cos(ang) * 0.76 - math.sin(ang) * 0.16
        sz = 1.78 + math.sin(ang) * 0.76 + math.cos(ang) * 0.16
        hub_parts.append(add_box(f"SailCloth_{b}", size=(0.28, 0.03, 1.05), loc=(sx, -0.96, sz), rot=(0, ang, 0), mat=m["sail"], bevel=0.005))

    join_into_anim_node(hub_parts, "Anim_Blades", (0, -0.85, 1.78))
    finalize_hierarchy_and_export("bldg_windmill.glb")


def build_bldg_argon_refinery():
    reset_scene()
    m = get_building_mats()
    add_cylinder("HexPad", radius=1.28, depth=0.56, vertices=6, loc=(0, 0, 0.28), mat=m["stone_dark"])
    add_cylinder("InnerRing", radius=0.94, depth=0.36, vertices=6, loc=(0, 0, 0.65), mat=m["iron"])

    for i in range(3):
        ang = (i * math.pi * 2) / 3.0
        px = math.cos(ang) * 0.84
        py = math.sin(ang) * 0.84
        add_box(f"Pylon_{i}", size=(0.24, 0.30, 1.48), loc=(px, py, 1.18), rot=(0, 0, ang), mat=m["stone_light"], bevel=0.03)
        add_icosphere(f"PylonNode_{i}", radius=0.18, loc=(px * 0.85, py * 0.85, 1.92), mat=m["argon"])

    fl = add_icosphere("ArgonCore", radius=0.45, subdivisions=2, loc=(0, 0, 1.68), scale=(0.85, 0.85, 1.6), mat=m["argon"])
    join_into_anim_node([fl], "Anim_Floater", (0, 0, 1.68))

    rt = add_torus("ArgonOrbitRing", major_radius=0.80, minor_radius=0.06, loc=(0, 0, 1.68), rot=(math.radians(25), 0, 0), mat=m["argon"])
    join_into_anim_node([rt], "Anim_Rotor", (0, 0, 1.68))

    finalize_hierarchy_and_export("bldg_argon_refinery.glb")


def build_bldg_archer_tower():
    reset_scene()
    m = get_building_mats()
    add_box("TowerBase", size=(1.38, 1.38, 0.72), loc=(0, 0, 0.36), mat=m["stone_dark"], bevel=0.06)
    add_box("TowerShaft", size=(1.02, 1.02, 2.25), loc=(0, 0, 1.62), mat=m["stone_light"], bevel=0.05)
    add_box("Battlement", size=(1.28, 1.28, 0.34), loc=(0, 0, 2.78), mat=m["stone_dark"], bevel=0.04)
    add_cone("WatchRoof", radius1=0.92, depth=0.88, vertices=4, loc=(0, 0, 3.88), rot=(0, 0, math.radians(45)), mat=m["roof_royal"])

    t1 = add_box("BallistaStock", size=(0.24, 1.15, 0.20), loc=(0, 0.22, 3.12), mat=m["wood"], bevel=0.02)
    t2 = add_box("BallistaProd", size=(0.95, 0.16, 0.10), loc=(0, 0.58, 3.16), mat=m["gold"], bevel=0.02)
    t3 = add_cylinder("BallistaBolt", radius=0.04, depth=0.95, loc=(0, 0.42, 3.22), rot=(math.radians(90), 0, 0), mat=m["argon"])
    join_into_anim_node([t1, t2, t3], "Anim_Turret", (0, 0, 3.12))

    finalize_hierarchy_and_export("bldg_archer_tower.glb")


def build_bldg_arcane_obelisk():
    reset_scene()
    m = get_building_mats()
    obsidian = make_mat("ObsidianMonolith", (0.12, 0.10, 0.28, 1.0), metallic=0.58, roughness=0.32)
    add_cylinder("ObeliskPedestal", radius=1.18, depth=0.58, vertices=8, loc=(0, 0, 0.29), mat=m["stone_dark"])
    add_cone("ObeliskPillar", radius1=0.62, radius2=0.32, depth=2.15, vertices=8, loc=(0, 0, 1.45), mat=obsidian)

    fl = add_icosphere("ObeliskApex", radius=0.44, subdivisions=2, loc=(0, 0, 2.95), scale=(0.85, 0.85, 1.65), mat=m["arcane"])
    join_into_anim_node([fl], "Anim_Floater", (0, 0, 2.95))

    r1 = add_torus("ArcaneRing1", major_radius=0.78, minor_radius=0.055, loc=(0, 0, 1.85), rot=(math.radians(18), 0, 0), mat=m["arcane"])
    r2 = add_torus("ArcaneRing2", major_radius=0.64, minor_radius=0.05, loc=(0, 0, 2.35), rot=(math.radians(-22), math.radians(15), 0), mat=m["gold"])
    join_into_anim_node([r1, r2], "Anim_Rotor", (0, 0, 2.1))

    finalize_hierarchy_and_export("bldg_arcane_obelisk.glb")


def build_bldg_flame_mortar():
    reset_scene()
    m = get_building_mats()
    add_cylinder("FoundryBase", radius=1.30, depth=0.64, vertices=16, loc=(0, 0, 0.32), mat=m["stone_dark"])
    add_cylinder("Turntable", radius=0.98, depth=0.45, vertices=16, loc=(0, 0, 0.76), mat=m["iron"])

    t1 = add_box("TrunnionL", size=(0.20, 0.60, 0.56), loc=(-0.54, 0, 1.22), mat=m["gold"], bevel=0.03)
    t2 = add_box("TrunnionR", size=(0.20, 0.60, 0.56), loc=(0.54, 0, 1.22), mat=m["gold"], bevel=0.03)
    t3 = add_cylinder("MortarBarrel", radius=0.46, depth=1.25, vertices=20, loc=(0, 0.18, 1.52), rot=(math.radians(-42), 0, 0), mat=m["iron"])
    t4 = add_sphere("MagmaBore", radius=0.35, loc=(0, 0.52, 1.86), mat=m["fire"])
    join_into_anim_node([t1, t2, t3, t4], "Anim_Turret", (0, 0, 1.05))

    finalize_hierarchy_and_export("bldg_flame_mortar.glb")


def build_bldg_frost_spire():
    reset_scene()
    m = get_building_mats()
    add_cylinder("GlacialBase", radius=1.18, depth=0.56, vertices=8, loc=(0, 0, 0.28), mat=m["stone_light"])
    add_cone("IceSpire", radius1=0.62, radius2=0.08, depth=2.55, vertices=8, loc=(0, 0, 1.65), mat=m["frost"])

    shards = []
    for i in range(5):
        ang = (i / 5.0) * math.pi * 2
        shards.append(
            add_icosphere(
                f"IceShard_{i}",
                radius=0.22,
                subdivisions=1,
                loc=(math.cos(ang)*0.82, math.sin(ang)*0.82, 1.55 + (i % 2)*0.28),
                scale=(0.75, 0.75, 1.85),
                mat=m["frost"],
            )
        )
    join_into_anim_node(shards, "Anim_Rotor", (0, 0, 1.65))

    finalize_hierarchy_and_export("bldg_frost_spire.glb")


def build_bldg_barracks():
    reset_scene()
    m = get_building_mats()
    add_box("GarrisonPlinth", size=(2.15, 1.68, 0.50), loc=(0, 0, 0.25), mat=m["stone_dark"], bevel=0.05)
    add_box("GarrisonHall", size=(1.88, 1.42, 1.15), loc=(0, 0, 0.98), mat=m["stone_light"], bevel=0.05)
    add_cone("GarrisonRoof", radius1=1.45, depth=0.98, vertices=4, loc=(0, 0, 1.92), rot=(0, 0, math.radians(45)), mat=m["roof_royal"])
    add_box("GarrisonGate", size=(0.56, 0.14, 0.80), loc=(0, 0.72, 0.72), mat=m["wood"], bevel=0.02)

    for sx in [-0.76, 0.76]:
        add_cylinder(f"BannerPole_{sx}", radius=0.05, depth=1.85, loc=(sx, 0.80, 1.35), mat=m["wood"])
        add_box(f"BannerFlag_{sx}", size=(0.30, 0.04, 0.56), loc=(sx, 0.86, 1.68), mat=m["gold"], bevel=0.01)

    finalize_hierarchy_and_export("bldg_barracks.glb")


def build_bldg_stone_wall():
    reset_scene()
    m = get_building_mats()
    add_box("WallFoundation", size=(1.88, 0.98, 0.72), loc=(0, 0, 0.36), mat=m["stone_dark"], bevel=0.05)
    add_box("WallRampart", size=(1.75, 0.85, 0.98), loc=(0, 0, 1.06), mat=m["stone_light"], bevel=0.05)
    for mx in [-0.6, 0.0, 0.6]:
        add_box(f"Merlon_{mx}", size=(0.38, 0.90, 0.36), loc=(mx, 0, 1.70), mat=m["stone_dark"], bevel=0.03)

    fl = add_icosphere("BastionRune", radius=0.25, subdivisions=1, loc=(0, 0, 2.15), scale=(0.85, 0.85, 1.4), mat=m["argon"])
    join_into_anim_node([fl], "Anim_Floater", (0, 0, 2.15))

    finalize_hierarchy_and_export("bldg_stone_wall.glb")


# =============================================================================
# PART D: 4 ENEMY ARCHETYPE MODELS & 3 ALLIED GARRISON TROOPS & 1 RIFT PORTAL
# =============================================================================

def build_enemy_infantry():
    reset_scene()
    primary = make_mat("PrimaryMat", (0.45, 0.68, 0.15, 1.0), metallic=0.25, roughness=0.45)
    accent = make_mat("AccentMat", (0.95, 0.25, 0.20, 1.0), metallic=0.4, roughness=0.25, emissive=(0.95, 0.25, 0.20, 1.0), emissive_strength=0.6)
    armor = make_mat("DarkArmor", (0.14, 0.16, 0.22, 1.0), metallic=0.75, roughness=0.38)

    add_box("Torso", size=(0.50, 0.36, 0.66), loc=(0, 0, 0.68), mat=primary, bevel=0.05)
    add_box("ChestPlate", size=(0.54, 0.40, 0.36), loc=(0, 0.02, 0.76), mat=armor, bevel=0.04)
    add_sphere("Head", radius=0.23, loc=(0, 0, 1.18), mat=primary)
    add_box("GlowingEyes", size=(0.20, 0.12, 0.08), loc=(0, 0.18, 1.20), mat=accent)
    add_cone("HelmSpike", radius1=0.09, depth=0.28, loc=(0, 0, 1.42), mat=armor)

    w1 = add_box("CleaverBlade", size=(0.10, 0.22, 0.68), loc=(0.36, 0.28, 0.78), rot=(math.radians(38), 0, 0), mat=armor, bevel=0.02)
    join_into_anim_node([w1], "Anim_Weapon", (0.36, 0.10, 0.72))

    finalize_hierarchy_and_export("enemy_infantry.glb")


def build_enemy_beast():
    reset_scene()
    primary = make_mat("PrimaryMat", (0.45, 0.28, 0.58, 1.0), metallic=0.25, roughness=0.48)
    accent = make_mat("AccentMat", (0.95, 0.35, 0.15, 1.0), metallic=0.35, roughness=0.25, emissive=(0.95, 0.35, 0.15, 1.0), emissive_strength=0.65)
    armor = make_mat("DarkArmor", (0.14, 0.16, 0.22, 1.0), metallic=0.75, roughness=0.38)

    add_sphere("Abdomen", radius=0.48, loc=(0, -0.18, 0.44), scale=(0.95, 1.25, 0.78), mat=primary)
    add_sphere("Cephalothorax", radius=0.30, loc=(0, 0.42, 0.46), mat=accent)
    for s in [-1, 1]:
        for ly in [-0.20, 0.08, 0.32]:
            add_box(f"BeastLeg_{s}_{ly}", size=(0.42, 0.10, 0.12), loc=(s * 0.48, ly, 0.26), rot=(0, s * math.radians(28), 0), mat=armor, bevel=0.02)

    finalize_hierarchy_and_export("enemy_beast.glb")


def build_enemy_golem():
    reset_scene()
    primary = make_mat("PrimaryMat", (0.38, 0.42, 0.48, 1.0), metallic=0.35, roughness=0.55)
    accent = make_mat("AccentMat", (0.98, 0.55, 0.12, 1.0), metallic=0.35, roughness=0.2, emissive=(0.98, 0.55, 0.12, 1.0), emissive_strength=0.85)
    armor = make_mat("DarkArmor", (0.15, 0.18, 0.24, 1.0), metallic=0.75, roughness=0.38)

    add_icosphere("GolemTorso", radius=0.72, subdivisions=2, loc=(0, 0, 0.96), scale=(1.0, 0.85, 1.1), mat=primary)
    add_icosphere("GolemCore", radius=0.28, subdivisions=1, loc=(0, 0.38, 1.0), mat=accent)
    for lx in [-0.30, 0.30]:
        add_box(f"GolemLeg_{lx}", size=(0.30, 0.32, 0.62), loc=(lx, 0, 0.31), mat=armor, bevel=0.05)
    for ax in [-0.64, 0.64]:
        add_box(f"GolemArm_{ax}", size=(0.32, 0.32, 0.76), loc=(ax, 0.16, 0.86), rot=(math.radians(18), 0, 0), mat=primary, bevel=0.05)

    finalize_hierarchy_and_export("enemy_golem.glb")


def build_enemy_flier():
    reset_scene()
    primary = make_mat("PrimaryMat", (0.28, 0.65, 0.92, 1.0), metallic=0.35, roughness=0.35)
    accent = make_mat("AccentMat", (0.98, 0.78, 0.22, 1.0), metallic=0.4, roughness=0.2, emissive=(0.98, 0.78, 0.22, 1.0), emissive_strength=0.85)

    # Built around origin (0,0,0) because proceduralMeshes sets bodyGroup.position.y = 2.6 for flying units
    add_icosphere("FlierBody", radius=0.42, subdivisions=2, loc=(0, 0, 0), scale=(0.88, 1.65, 0.78), mat=primary)
    add_sphere("FlierHead", radius=0.24, loc=(0, 0.44, 0.16), mat=accent)
    add_cone("FlierTail", radius1=0.18, depth=0.58, loc=(0, -0.62, -0.08), rot=(math.radians(85), 0, 0), mat=primary)

    wl = add_box("FlierWing_L", size=(0.95, 0.45, 0.08), loc=(-0.62, 0, 0.10), rot=(0, math.radians(-12), 0), mat=accent, bevel=0.02)
    join_into_anim_node([wl], "Anim_Wing_L", (-0.22, 0, 0.08))

    wr = add_box("FlierWing_R", size=(0.95, 0.45, 0.08), loc=(0.62, 0, 0.10), rot=(0, math.radians(12), 0), mat=accent, bevel=0.02)
    join_into_anim_node([wr], "Anim_Wing_R", (0.22, 0, 0.08))

    finalize_hierarchy_and_export("enemy_flier.glb")


def build_troop_model(filename, tabard_color, armor_color, has_wings=False):
    reset_scene()
    armor = make_mat("PrimaryMat", armor_color, metallic=0.80, roughness=0.26)
    tabard = make_mat("AccentMat", tabard_color, metallic=0.22, roughness=0.45)
    gold = make_mat("RoyalGold", (0.95, 0.72, 0.18, 1.0), metallic=0.88, roughness=0.22, emissive=(0.85, 0.55, 0.10, 1.0), emissive_strength=0.35)

    add_box("TroopTorso", size=(0.44, 0.34, 0.60), loc=(0, 0, 0.58), mat=tabard, bevel=0.05)
    add_sphere("TroopHelm", radius=0.21, loc=(0, 0, 1.05), mat=armor)
    add_cone("TroopPlume", radius1=0.09, depth=0.28, loc=(0, -0.04, 1.28), rot=(math.radians(-15), 0, 0), mat=gold)
    add_box("KiteShield", size=(0.10, 0.38, 0.52), loc=(-0.29, 0.12, 0.62), rot=(0, 0, math.radians(-12)), mat=gold, bevel=0.03)
    wp = add_box("KnightBlade", size=(0.08, 0.10, 0.72), loc=(0.29, 0.22, 0.78), rot=(math.radians(25), 0, 0), mat=armor, bevel=0.01)
    join_into_anim_node([wp], "Anim_Weapon", (0.29, 0.16, 0.65))

    if has_wings:
        wl = add_box("ValkWing_L", size=(0.58, 0.08, 0.28), loc=(-0.40, -0.18, 0.78), rot=(0, math.radians(-18), 0), mat=gold, bevel=0.02)
        join_into_anim_node([wl], "Anim_Wing_L", (-0.18, -0.18, 0.72))
        wr = add_box("ValkWing_R", size=(0.58, 0.08, 0.28), loc=(0.40, -0.18, 0.78), rot=(0, math.radians(18), 0), mat=gold, bevel=0.02)
        join_into_anim_node([wr], "Anim_Wing_R", (0.18, -0.18, 0.72))

    finalize_hierarchy_and_export(filename)


def build_prop_portal():
    reset_scene()
    obsidian = make_mat("PortalObsidian", (0.12, 0.10, 0.28, 1.0), metallic=0.58, roughness=0.35)
    rift_glow = make_mat("RiftGlow", (0.92, 0.45, 0.98, 1.0), metallic=0.2, roughness=0.15, emissive=(0.75, 0.15, 0.85, 1.0), emissive_strength=1.55)
    crimson_glow = make_mat("CrimsonGlow", (0.96, 0.25, 0.38, 1.0), metallic=0.2, roughness=0.2, emissive=(0.82, 0.08, 0.25, 1.0), emissive_strength=1.25)

    add_cylinder("PortalPlinth", radius=2.35, depth=0.32, vertices=24, loc=(0, 0, 0.16), mat=obsidian)
    add_cone("PillarL", radius1=0.52, radius2=0.18, depth=3.25, vertices=8, loc=(-1.45, 0, 1.65), rot=(0, math.radians(10), 0), mat=obsidian)
    add_cone("PillarR", radius1=0.52, radius2=0.18, depth=3.25, vertices=8, loc=(1.45, 0, 1.65), rot=(0, math.radians(-10), 0), mat=obsidian)

    r1 = add_torus("VortexOuter", major_radius=1.25, minor_radius=0.12, loc=(0, 0, 1.85), rot=(math.radians(90), 0, 0), mat=rift_glow)
    r2 = add_torus("VortexInner", major_radius=0.82, minor_radius=0.09, loc=(0, 0, 1.85), rot=(math.radians(75), math.radians(18), 0), mat=crimson_glow)
    join_into_anim_node([r1, r2], "Anim_Rotor", (0, 0, 1.85))

    finalize_hierarchy_and_export("prop_portal.glb")


if __name__ == "__main__":
    print("=== STARTING BLENDER 5.2 FULL 27-ASSET GLB STUDIO EXPORT ===")
    # 4 Monarch Heroes
    build_hero_arthuria()
    build_hero_kaelen()
    build_hero_sylvanis()
    build_hero_vespera()

    # 5 Act Bosses
    build_boss_kragasha()
    build_boss_borealis()
    build_boss_akhen_ra()
    build_boss_ignis_valkor()
    build_boss_malakor()

    # 10 Kingdom Buildings
    build_bldg_citadel()
    build_bldg_gold_mine()
    build_bldg_windmill()
    build_bldg_argon_refinery()
    build_bldg_archer_tower()
    build_bldg_arcane_obelisk()
    build_bldg_flame_mortar()
    build_bldg_frost_spire()
    build_bldg_barracks()
    build_bldg_stone_wall()

    # 4 Enemy Archetypes
    build_enemy_infantry()
    build_enemy_beast()
    build_enemy_golem()
    build_enemy_flier()

    # 3 Allied Troop Types
    build_troop_model("troop_swordsman.glb", (0.15, 0.38, 0.92, 1.0), (0.88, 0.90, 0.94, 1.0), has_wings=False)
    build_troop_model("troop_paladin.glb", (0.95, 0.62, 0.08, 1.0), (0.98, 0.94, 0.55, 1.0), has_wings=False)
    build_troop_model("troop_valkyrie.glb", (0.22, 0.74, 0.98, 1.0), (0.98, 0.94, 0.55, 1.0), has_wings=True)

    # 1 Abyssal Rift Portal
    build_prop_portal()
    print("=== ALL 27 BLENDER GLB MODELS SUCCESSFULLY GENERATED ===")
