#include "SpsModel.h"

#include <algorithm>
#include <cmath>

namespace sps {
namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr Point kBaseLinkPivot{118.258, 0.0, 0.0};
constexpr Point kJointBaseArm1{-450.742, 0.0, 385.188};
constexpr Point kJointArm1Arm2{-450.742, 0.0, 3782.1};
constexpr Point kJointArm2Arm3{2596.265, 0.0, 3782.1};
constexpr Point kJointArm3Tool{2596.265, 0.0, 1728.536};
constexpr double kToolLength = 730.0;
constexpr Point kAct1Tail{0.0, 0.0, 0.0};
constexpr Point kAct1FrontCal{-766.162, 0.0, 1915.092};
constexpr Point kAct2TailCal{-766.242, 0.0, 2177.092};
constexpr Point kAct3TailCal{818.447, 0.0, 3901.033};
constexpr Point kLinkACommonCal{-226.672, 0.0, 3691.4};
constexpr Point kLinkA1AnchorCal{-630.742, 0.0, 3748.117};
constexpr Point kLinkA2AnchorCal{-90.799, 0.0, 3774.02};
constexpr double kLinkA1Length = 407.5;
constexpr double kLinkA2Length = 157.0;
constexpr Point kLinkBCommonCal{2488.713, 0.0, 3601.608};
constexpr Point kLinkB1AnchorCal{2551.0, 0.0, 3988.9};
constexpr Point kLinkB2AnchorCal{2627.74, 0.0, 3570.291};
constexpr double kLinkB1Length = 392.0;
constexpr double kLinkB2Length = 168.0;

double round3(double value) {
  return std::round(value * 1000.0) / 1000.0;
}

Point pointKey(Point p) {
  return {round3(p.x), round3(p.y), round3(p.z)};
}

double degToRad(double degrees) {
  return degrees * kPi / 180.0;
}

double wrapDegrees(double degrees) {
  double wrapped = std::fmod(degrees + 180.0, 360.0);
  if (wrapped < 0.0) wrapped += 360.0;
  wrapped -= 180.0;
  if (std::abs(wrapped + 180.0) < 0.000001) wrapped = 180.0;
  return wrapped;
}

double angleDistance(double a, double b) {
  return wrapDegrees(a - b);
}

Point rotateXZ(Point p, double degrees) {
  const double angle = degToRad(degrees);
  return {p.x * std::cos(angle) - p.z * std::sin(angle), p.y, p.x * std::sin(angle) + p.z * std::cos(angle)};
}

Point rotateXYAround(Point p, double degrees, Point pivot = kBaseLinkPivot) {
  const double angle = degToRad(degrees);
  const double x = p.x - pivot.x;
  const double y = p.y - pivot.y;
  return pointKey({pivot.x + x * std::cos(angle) - y * std::sin(angle), pivot.y + x * std::sin(angle) + y * std::cos(angle), p.z});
}

Point transformLocalPoint(Point origin, double angleDegrees, Point local) {
  const Point rotated = rotateXZ(local, angleDegrees);
  return pointKey({origin.x + rotated.x, origin.y + rotated.y, origin.z + rotated.z});
}

Angles absoluteAnglesForState(State rawState) {
  State state = clampState(rawState);
  return {state.arm1, state.arm1 - state.arm2, state.arm1 - state.arm2 - state.arm3, state.arm1 - state.arm2 - state.arm3 - state.offset};
}

Point calibrationOrigin(const std::string &segmentKey) {
  if (segmentKey == "arm1") return kJointBaseArm1;
  if (segmentKey == "arm2") return kJointArm1Arm2;
  if (segmentKey == "arm3") return kJointArm2Arm3;
  return kJointArm3Tool;
}

double calibrationAngle(const std::string &segmentKey) {
  const Angles angles = absoluteAnglesForState(kDefaultState);
  if (segmentKey == "arm1") return angles.arm1;
  if (segmentKey == "arm2") return angles.arm2;
  if (segmentKey == "arm3") return angles.arm3;
  return angles.tool;
}

Point localFromWorldAtCalibration(Point worldPoint, const std::string &segmentKey) {
  const Point origin = calibrationOrigin(segmentKey);
  const Point relative{worldPoint.x - origin.x, worldPoint.y - origin.y, worldPoint.z - origin.z};
  return transformLocalPoint({0.0, 0.0, 0.0}, -calibrationAngle(segmentKey), relative);
}

Point frameOriginForPose(const Pose &pose, const std::string &segmentKey) {
  if (segmentKey == "arm1") return pose.joints[0];
  if (segmentKey == "arm2") return pose.joints[1];
  if (segmentKey == "arm3") return pose.joints[2];
  return pose.joints[3];
}

double frameAngleForPose(const Pose &pose, const std::string &segmentKey) {
  if (segmentKey == "arm1") return pose.absoluteAngles.arm1;
  if (segmentKey == "arm2") return pose.absoluteAngles.arm2;
  if (segmentKey == "arm3") return pose.absoluteAngles.arm3;
  return pose.absoluteAngles.tool;
}

Point pointOnPoseSegment(const Pose &pose, Point worldAtCalibration, const std::string &segmentKey) {
  const Point local = localFromWorldAtCalibration(worldAtCalibration, segmentKey);
  return transformLocalPoint(frameOriginForPose(pose, segmentKey), frameAngleForPose(pose, segmentKey), local);
}

Point solveFixedLinkCommon(Point anchor1, double length1, Point anchor2, double length2, Point preferred, double &error) {
  const double dx = anchor2.x - anchor1.x;
  const double dz = anchor2.z - anchor1.z;
  const double distanceXZ = std::sqrt(dx * dx + dz * dz);
  if (distanceXZ < 0.001) {
    error = std::max(std::abs(distance(preferred, anchor1) - length1), std::abs(distance(preferred, anchor2) - length2));
    return pointKey(preferred);
  }

  const double ux = dx / distanceXZ;
  const double uz = dz / distanceXZ;
  const double along = (length1 * length1 - length2 * length2 + distanceXZ * distanceXZ) / (2.0 * distanceXZ);
  const double height = std::sqrt(std::max(0.0, length1 * length1 - along * along));
  const Point base{anchor1.x + ux * along, preferred.y, anchor1.z + uz * along};
  const Point candidateA{base.x - uz * height, base.y, base.z + ux * height};
  const Point candidateB{base.x + uz * height, base.y, base.z - ux * height};
  const Point chosen = distance(candidateA, preferred) < distance(candidateB, preferred) ? candidateA : candidateB;
  error = round3(std::max(std::abs(distance(chosen, anchor1) - length1), std::abs(distance(chosen, anchor2) - length2)));
  return pointKey(chosen);
}

LinkagePose computeLinkage(const Pose &pose, Point commonCal, const std::string &commonOn, Point link1Cal, const std::string &link1On, double link1Length, Point link2Cal, const std::string &link2On, double link2Length) {
  LinkagePose linkage;
  linkage.link1Anchor = pointOnPoseSegment(pose, link1Cal, link1On);
  linkage.link2Anchor = pointOnPoseSegment(pose, link2Cal, link2On);
  linkage.preferred = pointOnPoseSegment(pose, commonCal, commonOn);
  linkage.common = solveFixedLinkCommon(linkage.link1Anchor, link1Length, linkage.link2Anchor, link2Length, linkage.preferred, linkage.error);
  linkage.link1Actual = distance(linkage.common, linkage.link1Anchor);
  linkage.link2Actual = distance(linkage.common, linkage.link2Anchor);
  return linkage;
}

ActuatorPose actuator(Point tail, Point front) {
  return {tail, front, distance(tail, front)};
}

double solveScore(State state, State current, Point target) {
  const Point displayTip = worldDisplayedToolPointForState(state);
  const double dx = displayTip.x - target.x;
  const double dy = displayTip.y - target.y;
  const double dz = displayTip.z - target.z;
  const double continuity =
      std::abs(angleDistance(state.arm1, current.arm1)) * 0.08 +
      std::abs(angleDistance(state.arm2, current.arm2)) * 0.04 +
      std::abs(angleDistance(state.arm3, current.arm3)) * 0.04 +
      std::abs(angleDistance(state.base, current.base)) * 0.04;
  return std::sqrt(dx * dx + dy * dy + dz * dz) + continuity;
}

}  // namespace

const State kDefaultState{90.0, 90.0, 90.0, 0.0, 180.0};
const Point kDisplayToolOffset{0.0, 262.0, 0.0};

double distance(Point a, Point b) {
  const double dx = a.x - b.x;
  const double dy = a.y - b.y;
  const double dz = a.z - b.z;
  return std::sqrt(dx * dx + dy * dy + dz * dz);
}

State clampState(State state) {
  return {
      std::clamp(state.arm1, 0.0, 120.0),
      std::clamp(state.arm2, 0.0, 180.0),
      std::clamp(state.arm3, 0.0, 180.0),
      std::clamp(state.offset, -270.0, 210.0),
      std::clamp(state.base, -180.0, 180.0),
  };
}

State presetState(const std::string &key, State current) {
  if (key == "calibration") return clampState({90.0, 90.0, 90.0, 0.0, 0.0});
  if (key == "folded") return clampState({0.0, 180.0, 180.0, 0.0, 180.0});
  return clampState(current);
}

State stateFromActuatorStrokes(double arm1Stroke, double arm2Stroke, double arm3Stroke, State current) {
  State next = current;
  next.arm1 = 120.0 * std::clamp(arm1Stroke, 0.0, 1.0);
  next.arm2 = 180.0 - 180.0 * std::clamp(arm2Stroke, 0.0, 1.0);
  next.arm3 = 180.0 - 180.0 * std::clamp(arm3Stroke, 0.0, 1.0);
  return clampState(next);
}

Pose computePose(State rawState) {
  Pose pose;
  pose.state = clampState(rawState);
  pose.absoluteAngles = absoluteAnglesForState(pose.state);
  pose.joints[0] = kJointBaseArm1;
  pose.joints[1] = transformLocalPoint(pose.joints[0], pose.absoluteAngles.arm1, {distance(kJointBaseArm1, kJointArm1Arm2), 0.0, 0.0});
  pose.joints[2] = transformLocalPoint(pose.joints[1], pose.absoluteAngles.arm2, {distance(kJointArm1Arm2, kJointArm2Arm3), 0.0, 0.0});
  pose.joints[3] = transformLocalPoint(pose.joints[2], pose.absoluteAngles.arm3, {distance(kJointArm2Arm3, kJointArm3Tool), 0.0, 0.0});
  pose.toolCenter = transformLocalPoint(pose.joints[3], pose.absoluteAngles.tool, {kToolLength, 0.0, 0.0});
  pose.displayedTip = rotateXYAround({pose.toolCenter.x + kDisplayToolOffset.x, pose.toolCenter.y + kDisplayToolOffset.y, pose.toolCenter.z + kDisplayToolOffset.z}, -pose.state.base);
  pose.segments = {
      {"arm1", pose.joints[0], pose.joints[1], pose.absoluteAngles.arm1},
      {"arm2", pose.joints[1], pose.joints[2], pose.absoluteAngles.arm2},
      {"arm3", pose.joints[2], pose.joints[3], pose.absoluteAngles.arm3},
      {"tool", pose.joints[3], pose.toolCenter, pose.absoluteAngles.tool},
  };
  pose.linkageA = computeLinkage(pose, kLinkACommonCal, "arm2", kLinkA1AnchorCal, "arm1", kLinkA1Length, kLinkA2AnchorCal, "arm2", kLinkA2Length);
  pose.linkageB = computeLinkage(pose, kLinkBCommonCal, "arm3", kLinkB1AnchorCal, "arm2", kLinkB1Length, kLinkB2AnchorCal, "arm3", kLinkB2Length);
  pose.actuator1 = actuator(kAct1Tail, pointOnPoseSegment(pose, kAct1FrontCal, "arm1"));
  pose.actuator2 = actuator(pointOnPoseSegment(pose, kAct2TailCal, "arm1"), pose.linkageA.common);
  pose.actuator3 = actuator(pointOnPoseSegment(pose, kAct3TailCal, "arm2"), pose.linkageB.common);
  return pose;
}

Point worldDisplayedToolPointForState(State rawState) {
  return computePose(rawState).displayedTip;
}

LinearSolve solveStateForWorldDisplayedToolTarget(Point targetWorld, State currentState) {
  State candidate = clampState(currentState);
  double step = 16.0;
  double bestScore = solveScore(candidate, currentState, targetWorld);
  const std::array<std::string, 4> keys{"arm1", "arm2", "arm3", "base"};

  for (int iteration = 0; iteration < 240; ++iteration) {
    bool improved = false;
    for (const std::string &key : keys) {
      for (double direction : {-1.0, 1.0}) {
        State next = candidate;
        if (key == "arm1") next.arm1 += direction * step;
        if (key == "arm2") next.arm2 += direction * step;
        if (key == "arm3") next.arm3 += direction * step;
        if (key == "base") next.base = wrapDegrees(next.base + direction * step);
        next = clampState(next);
        const double nextScore = solveScore(next, currentState, targetWorld);
        if (nextScore + 0.001 < bestScore) {
          candidate = next;
          bestScore = nextScore;
          improved = true;
        }
      }
    }
    if (!improved) step *= 0.62;
    if (step < 0.05) break;
  }

  LinearSolve solve;
  solve.state = candidate;
  solve.pose = computePose(candidate);
  solve.target = targetWorld;
  solve.error = solveScore(candidate, currentState, targetWorld);
  solve.reachable = bestScore < 35.0;
  return solve;
}

Point lerp(Point a, Point b, double t) {
  const double clamped = std::clamp(t, 0.0, 1.0);
  return {a.x + (b.x - a.x) * clamped, a.y + (b.y - a.y) * clamped, a.z + (b.z - a.z) * clamped};
}

}  // namespace sps
