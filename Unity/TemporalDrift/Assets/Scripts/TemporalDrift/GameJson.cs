using UnityEngine;

namespace TemporalDrift
{
    public static class GameJson
    {
        public static T Load<T>(string resourceName) where T : class, new()
        {
            var asset = Resources.Load<TextAsset>("TemporalDrift/" + resourceName);
            if (asset == null)
            {
                Debug.LogError($"Missing Resources/TemporalDrift/{resourceName}.json");
                return new T();
            }

            return JsonUtility.FromJson<T>(asset.text) ?? new T();
        }
    }
}
