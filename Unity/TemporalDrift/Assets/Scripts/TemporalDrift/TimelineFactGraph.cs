using System;
using System.Collections.Generic;

namespace TemporalDrift
{
    public sealed class TimelineFactGraph
    {
        readonly Dictionary<string, FactDefinitionData> _definitions = new Dictionary<string, FactDefinitionData>();
        readonly Dictionary<string, bool> _baseValues = new Dictionary<string, bool>();
        readonly Dictionary<string, bool> _overrides = new Dictionary<string, bool>();
        readonly Dictionary<string, bool> _computed = new Dictionary<string, bool>();

        public IReadOnlyDictionary<string, bool> Computed => _computed;

        public TimelineFactGraph(TimelineFactsData data)
        {
            if (data?.facts == null) return;
            foreach (var fact in data.facts)
            {
                _definitions[fact.id] = fact;
                _baseValues[fact.id] = fact.defaultValue;
            }

            Recompute();
        }

        public bool GetFact(string id)
        {
            return _computed.TryGetValue(id, out var value) && value;
        }

        public bool SetBaseFact(string id, bool value)
        {
            if (!_definitions.ContainsKey(id))
            {
                return false;
            }

            var definition = _definitions[id];
            if (definition.dependencies != null && definition.dependencies.Count > 0)
            {
                _overrides[id] = value;
            }
            else
            {
                _baseValues[id] = value;
            }

            Recompute();
            return true;
        }

        public void Recompute()
        {
            var visiting = new HashSet<string>();
            var done = new HashSet<string>();
            _computed.Clear();
            foreach (var id in _definitions.Keys)
            {
                Evaluate(id, visiting, done);
            }
        }

        bool Evaluate(string id, HashSet<string> visiting, HashSet<string> done)
        {
            if (done.Contains(id)) return _computed[id];
            if (visiting.Contains(id))
            {
                throw new InvalidOperationException($"Timeline fact graph cycle at {id}");
            }

            visiting.Add(id);
            var def = _definitions[id];
            var dependenciesSatisfied = true;
            if (def.dependencies != null)
            {
                foreach (var dep in def.dependencies)
                {
                    if (!_definitions.ContainsKey(dep.id))
                    {
                        dependenciesSatisfied = false;
                        break;
                    }

                    var depValue = Evaluate(dep.id, visiting, done);
                    if (depValue != dep.requiredValue)
                    {
                        dependenciesSatisfied = false;
                        break;
                    }
                }
            }

            bool value;
            if (def.dependencies != null && def.dependencies.Count > 0)
            {
                value = dependenciesSatisfied ? def.valueWhenDependenciesSatisfied : def.defaultValue;
            }
            else
            {
                value = _baseValues[id];
            }

            if (_overrides.TryGetValue(id, out var overridden))
            {
                value = overridden;
            }

            visiting.Remove(id);
            done.Add(id);
            _computed[id] = value;
            return value;
        }
    }
}
