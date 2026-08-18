using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace TemporalDrift.Editor
{
    public static class CreateStarterScene
    {
        [MenuItem("Temporal Drift/Generate Starter Scene")]
        public static void Generate()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            var light = UnityEngine.Object.FindFirstObjectByType<Light>();
            if (light != null)
            {
                light.color = new Color(1f, 0.92f, 0.78f);
                light.intensity = 1.1f;
            }

            var layoutAsset = Resources.Load<TextAsset>("TemporalDrift/HillValleyLayout");
            var layout = layoutAsset != null ? JsonUtility.FromJson<LayoutFile>(layoutAsset.text) : new LayoutFile();
            var world = new GameObject("HillValley");
            var shared = new GameObject("Shared").transform;
            shared.SetParent(world.transform);
            var era1985 = new GameObject("Era_1985").transform;
            era1985.SetParent(world.transform);
            var era1955 = new GameObject("Era_1955").transform;
            era1955.SetParent(world.transform);
            era1955.gameObject.SetActive(false);

            if (layout.blocks != null)
            {
                foreach (var block in layout.blocks)
                {
                    var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    cube.name = block.name;
                    cube.transform.SetParent(shared);
                    cube.transform.position = ToUnity(block.x, block.y, block.z, layout.townOffsetY);
                    cube.transform.localScale = new Vector3(block.sx, block.sz, block.sy) / 100f;
                    var renderer = cube.GetComponent<Renderer>();
                    renderer.sharedMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"))
                    {
                        color = new Color(block.color[0], block.color[1], block.color[2])
                    };
                }
            }

            var vehicle = new GameObject("HeroTimeMachine");
            var spawn = layout.spawn ?? new SpawnData();
            vehicle.transform.position = ToUnity(spawn.vehicleX, spawn.vehicleY, spawn.vehicleZ, layout.townOffsetY) + Vector3.up * 1.2f;
            var body = vehicle.AddComponent<Rigidbody>();
            body.mass = 1320f;
            var hull = GameObject.CreatePrimitive(PrimitiveType.Cube);
            hull.name = "CollisionHull";
            hull.transform.SetParent(vehicle.transform, false);
            hull.transform.localScale = new Vector3(1.85f, 1.15f, 4.2f);
            UnityEngine.Object.DestroyImmediate(hull.GetComponent<BoxCollider>());
            vehicle.AddComponent<BoxCollider>().size = new Vector3(1.85f, 1.15f, 4.2f);
            var mesh = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Vehicles/HeroTimeMachine.fbx");
            if (mesh != null)
            {
                var visual = (GameObject)UnityEngine.Object.Instantiate(mesh);
                visual.name = "HeroTimeMachineVisual";
                visual.transform.SetParent(vehicle.transform, false);
                visual.transform.localScale = Vector3.one * 0.01f;
            }

            var controller = vehicle.AddComponent<HeroTimeMachineController>();
            var camera = UnityEngine.Object.FindFirstObjectByType<Camera>();
            if (camera != null)
            {
                var rig = new GameObject("ChaseCameraRig");
                rig.transform.SetParent(vehicle.transform, false);
                camera.transform.SetParent(rig.transform, false);
                camera.transform.localPosition = new Vector3(0f, 2.2f, -7.5f);
                camera.transform.localRotation = Quaternion.Euler(12f, 0f, 0f);
            }

            var director = new GameObject("GameDirector").AddComponent<GameDirector>();
            var so = new SerializedObject(director);
            so.FindProperty("vehicle").objectReferenceValue = controller;
            so.FindProperty("eraRoot1955").objectReferenceValue = era1955;
            so.FindProperty("eraRoot1985").objectReferenceValue = era1985;
            so.ApplyModifiedPropertiesWithoutUndo();

            System.IO.Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, "Assets/Scenes/TimeTravelTest.unity");
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene("Assets/Scenes/TimeTravelTest.unity", true)
            };
            Debug.Log("Temporal Drift starter scene saved to Assets/Scenes/TimeTravelTest.unity");
        }

        static Vector3 ToUnity(float xCm, float yCm, float zCm, float townOffsetY)
        {
            // Unreal cm, X forward, Y right, Z up → Unity meters, Z forward, Y up.
            return new Vector3(xCm / 100f, zCm / 100f, (yCm + townOffsetY) / 100f);
        }

        [Serializable]
        class LayoutFile
        {
            public float townOffsetY = 7600f;
            public BlockData[] blocks;
            public SpawnData spawn;
        }

        [Serializable]
        class BlockData
        {
            public string name;
            public float x, y, z, sx, sy, sz;
            public float[] color;
        }

        [Serializable]
        class SpawnData
        {
            public float vehicleX = -2400f;
            public float vehicleY = 400f;
            public float vehicleZ = 80f;
        }
    }
}
