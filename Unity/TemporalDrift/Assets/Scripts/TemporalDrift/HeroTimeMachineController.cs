using UnityEngine;

namespace TemporalDrift
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class HeroTimeMachineController : MonoBehaviour
    {
        public TimeTravelSystem TimeTravel { get; set; }
        public VehicleTuningData Tuning { get; set; }
        public TimelineState Destination = TimelineState.Past1955;

        Rigidbody _body;
        float _throttle;
        float _steer;
        bool _hover;

        public float SpeedMph { get; private set; }

        void Awake()
        {
            _body = GetComponent<Rigidbody>();
            _body.mass = Tuning != null ? Tuning.massKg : 1320f;
            _body.interpolation = RigidbodyInterpolation.Interpolate;
            _body.centerOfMass = new Vector3(0f, 0.2f, 0f);
        }

        void Update()
        {
            _throttle = Input.GetKey(KeyCode.UpArrow) ? 1f : Input.GetKey(KeyCode.DownArrow) ? -1f : 0f;
            _steer = 0f;
            if (Input.GetKey(KeyCode.LeftArrow)) _steer -= 1f;
            if (Input.GetKey(KeyCode.RightArrow)) _steer += 1f;
            if (Input.GetKeyDown(KeyCode.H)) _hover = !_hover;
            if (Input.GetKeyDown(KeyCode.R)) ResetPose();
            if (Input.GetKeyDown(KeyCode.T)) TimeTravel?.SetTimeCircuitsArmed(!(TimeTravel?.TimeCircuitsArmed ?? false));
            if (Input.GetKeyDown(KeyCode.Q)) TimeTravel?.CycleDestination(ref Destination, -1);
            if (Input.GetKeyDown(KeyCode.E)) TimeTravel?.CycleDestination(ref Destination, 1);
            if (Input.GetKeyDown(KeyCode.F)) TryJump();
        }

        void FixedUpdate()
        {
            var tuning = Tuning ?? new VehicleTuningData();
            SpeedMph = _body.linearVelocity.magnitude * 2.23693629f;
            TimeTravel?.ChargeFromSpeed(SpeedMph, Time.fixedDeltaTime);

            if (_hover)
            {
                var lift = (tuning.hoverTargetHeight - transform.position.y) * tuning.hoverSpringStrength
                           - _body.linearVelocity.y * tuning.hoverDamping;
                _body.AddForce(Vector3.up * lift, ForceMode.Acceleration);
                _body.AddForce(transform.forward * (_throttle * tuning.hoverForwardAcceleration * 0.02f), ForceMode.Acceleration);
                _body.AddTorque(Vector3.up * (_steer * tuning.hoverYawAcceleration), ForceMode.Acceleration);
                return;
            }

            _body.AddForce(transform.forward * (_throttle * tuning.motorTorque / Mathf.Max(1f, _body.mass)), ForceMode.Acceleration);
            var steer = _steer * tuning.maxSteerAngleDegrees * Mathf.Deg2Rad * Mathf.Clamp01(SpeedMph / 25f);
            _body.MoveRotation(_body.rotation * Quaternion.Euler(0f, steer * Mathf.Rad2Deg * Time.fixedDeltaTime * 4f, 0f));
            if (Input.GetKey(KeyCode.Space))
            {
                _body.linearVelocity *= 0.96f;
            }
        }

        void TryJump()
        {
            if (TimeTravel == null) return;
            TimeTravel.RequestTimeTravel(new TimeTravelRequest
            {
                Destination = Destination,
                EntrySpeedMph = SpeedMph
            });
        }

        void ResetPose()
        {
            _body.linearVelocity = Vector3.zero;
            _body.angularVelocity = Vector3.zero;
            transform.SetPositionAndRotation(new Vector3(-24f, 1.2f, 4f), Quaternion.identity);
        }
    }
}
