#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>

constexpr double PI = 3.14159265358979323846;

struct Point {
  double x;
  double y;
  double z;
};

struct Limit {
  double min;
  double max;
};

struct State {
  double arm1;
  double arm2;
  double arm3;
  double offset;
  double base;
};

struct Angles {
  double arm1;
  double arm2;
  double arm3;
  double tool;
};

struct LinkagePose {
  Point common;
  Point preferred;
  Point link1_anchor;
  Point link2_anchor;
  double error;
  double link1_actual;
  double link2_actual;
};

struct ActuatorPose {
  Point tail;
  Point front;
  double length;
};

struct Pose {
  State state;
  Angles absolute_angles;
  std::array<Point, 4> joints;
  Point tool_center;
  LinkagePose linkage_a;
  LinkagePose linkage_b;
  ActuatorPose actuator1;
  ActuatorPose actuator2;
  ActuatorPose actuator3;
};

static const Limit LIMIT_ARM1 = {0.0, 120.0};
static const Limit LIMIT_ARM2 = {0.0, 180.0};
static const Limit LIMIT_ARM3 = {0.0, 180.0};
static const Limit LIMIT_OFFSET = {-270.0, 210.0};
static const Limit LIMIT_BASE = {-180.0, 180.0};

static const State DEFAULT_STATE = {90.0, 90.0, 90.0, 0.0, 180.0};
static const Point BASE_LINK_PIVOT = {118.258, 0.0, 0.0};
static const Point DISPLAY_TOOL_OFFSET = {0.0, 262.0, 0.0};

static const Point JOINT_BASE_ARM1 = {-450.742, 0.0, 385.188};
static const Point JOINT_ARM1_ARM2 = {-450.742, 0.0, 3782.1};
static const Point JOINT_ARM2_ARM3 = {2596.265, 0.0, 3782.1};
static const Point JOINT_ARM3_TOOL = {2596.265, 0.0, 1728.536};
static const double TOOL_LENGTH_MM = 730.0;

static const Point ACT1_TAIL = {0.0, 0.0, 0.0};
static const Point ACT1_FRONT_CAL = {-766.162, 0.0, 1915.092};
static const Point ACT2_TAIL_CAL = {-766.242, 0.0, 2177.092};
static const Point ACT3_TAIL_CAL = {818.447, 0.0, 3901.033};

static const Point LINK_A_COMMON_CAL = {-226.672, 0.0, 3691.4};
static const Point LINK_A1_ANCHOR_CAL = {-630.742, 0.0, 3748.117};
static const Point LINK_A2_ANCHOR_CAL = {-90.799, 0.0, 3774.02};
static const double LINK_A1_LENGTH = 407.5;
static const double LINK_A2_LENGTH = 157.0;

static const Point LINK_B_COMMON_CAL = {2488.713, 0.0, 3601.608};
static const Point LINK_B1_ANCHOR_CAL = {2551.0, 0.0, 3988.9};
static const Point LINK_B2_ANCHOR_CAL = {2627.74, 0.0, 3570.291};
static const double LINK_B1_LENGTH = 392.0;
static const double LINK_B2_LENGTH = 168.0;

static double clamp(double value, double min, double max) {
  return std::clamp(value, min, max);
}

static double deg_to_rad(double degrees) {
  return degrees * PI / 180.0;
}

static double round3(double value) {
  return std::round(value * 1000.0) / 1000.0;
}

static double distance_points(Point a, Point b) {
  const double dx = a.x - b.x;
  const double dy = a.y - b.y;
  const double dz = a.z - b.z;
  return std::sqrt(dx * dx + dy * dy + dz * dz);
}

static Point point(double x, double y, double z) {
  Point p = {x, y, z};
  return p;
}

static Point point_key(Point p) {
  return point(round3(p.x), round3(p.y), round3(p.z));
}

static Point point_add(Point a, Point b) {
  return point(a.x + b.x, a.y + b.y, a.z + b.z);
}

static Point rotate_xz(Point p, double degrees) {
  const double angle = deg_to_rad(degrees);
  return point(
      p.x * std::cos(angle) - p.z * std::sin(angle),
      p.y,
      p.x * std::sin(angle) + p.z * std::cos(angle));
}

static Point rotate_xy_around(Point p, double degrees, Point pivot) {
  const double angle = deg_to_rad(degrees);
  const double x = p.x - pivot.x;
  const double y = p.y - pivot.y;
  return point_key(point(
      pivot.x + x * std::cos(angle) - y * std::sin(angle),
      pivot.y + x * std::sin(angle) + y * std::cos(angle),
      p.z));
}

static Point transform_local_point(Point origin, double angle_degrees, Point local) {
  Point rotated = rotate_xz(local, angle_degrees);
  return point_key(point(origin.x + rotated.x, origin.y + rotated.y, origin.z + rotated.z));
}

static State clamp_state(State state) {
  State next = {
      clamp(state.arm1, LIMIT_ARM1.min, LIMIT_ARM1.max),
      clamp(state.arm2, LIMIT_ARM2.min, LIMIT_ARM2.max),
      clamp(state.arm3, LIMIT_ARM3.min, LIMIT_ARM3.max),
      clamp(state.offset, LIMIT_OFFSET.min, LIMIT_OFFSET.max),
      clamp(state.base, LIMIT_BASE.min, LIMIT_BASE.max),
  };
  return next;
}

static double wrap_degrees(double degrees) {
  double wrapped = std::fmod(degrees + 180.0, 360.0);
  if (wrapped < 0.0) wrapped += 360.0;
  wrapped -= 180.0;
  if (std::fabs(wrapped + 180.0) < 0.000001) wrapped = 180.0;
  return wrapped;
}

static double angle_distance(double a, double b) {
  return wrap_degrees(a - b);
}

static Angles absolute_angles_for_state(State raw_state) {
  State state = clamp_state(raw_state);
  Angles angles = {
      state.arm1,
      state.arm1 - state.arm2,
      state.arm1 - state.arm2 - state.arm3,
      state.arm1 - state.arm2 - state.arm3 - state.offset,
  };
  return angles;
}

static double arm_length(Point a, Point b) {
  return distance_points(a, b);
}

static Point calibration_origin_for_segment(const char *segment_key) {
  if (strcmp(segment_key, "arm1") == 0) return JOINT_BASE_ARM1;
  if (strcmp(segment_key, "arm2") == 0) return JOINT_ARM1_ARM2;
  if (strcmp(segment_key, "arm3") == 0) return JOINT_ARM2_ARM3;
  return JOINT_ARM3_TOOL;
}

static double calibration_angle_for_segment(const char *segment_key) {
  Angles angles = absolute_angles_for_state(DEFAULT_STATE);
  if (strcmp(segment_key, "arm1") == 0) return angles.arm1;
  if (strcmp(segment_key, "arm2") == 0) return angles.arm2;
  if (strcmp(segment_key, "arm3") == 0) return angles.arm3;
  return angles.tool;
}

static Point local_from_world_at_calibration(Point world_point, const char *segment_key) {
  Point origin = calibration_origin_for_segment(segment_key);
  Point relative = point(world_point.x - origin.x, world_point.y - origin.y, world_point.z - origin.z);
  return transform_local_point(point(0.0, 0.0, 0.0), -calibration_angle_for_segment(segment_key), relative);
}

static Point frame_origin_for_pose(const Pose *pose, const char *segment_key) {
  if (strcmp(segment_key, "arm1") == 0) return pose->joints[0];
  if (strcmp(segment_key, "arm2") == 0) return pose->joints[1];
  if (strcmp(segment_key, "arm3") == 0) return pose->joints[2];
  return pose->joints[3];
}

static double frame_angle_for_pose(const Pose *pose, const char *segment_key) {
  if (strcmp(segment_key, "arm1") == 0) return pose->absolute_angles.arm1;
  if (strcmp(segment_key, "arm2") == 0) return pose->absolute_angles.arm2;
  if (strcmp(segment_key, "arm3") == 0) return pose->absolute_angles.arm3;
  return pose->absolute_angles.tool;
}

static Point point_on_pose_segment(const Pose *pose, Point world_at_calibration, const char *segment_key) {
  Point local = local_from_world_at_calibration(world_at_calibration, segment_key);
  return transform_local_point(
      frame_origin_for_pose(pose, segment_key),
      frame_angle_for_pose(pose, segment_key),
      local);
}

static Point solve_fixed_link_common(
    Point anchor1,
    double length1,
    Point anchor2,
    double length2,
    Point preferred,
    double *error) {
  const double dx = anchor2.x - anchor1.x;
  const double dz = anchor2.z - anchor1.z;
  const double distance_xz = std::sqrt(dx * dx + dz * dz);
  if (distance_xz < 0.001) {
    *error = std::fmax(std::fabs(distance_points(preferred, anchor1) - length1),
                       std::fabs(distance_points(preferred, anchor2) - length2));
    return point_key(preferred);
  }

  const double ux = dx / distance_xz;
  const double uz = dz / distance_xz;
  const double along = (length1 * length1 - length2 * length2 + distance_xz * distance_xz) / (2.0 * distance_xz);
  const double height_sq = length1 * length1 - along * along;
  const double height = std::sqrt(std::fmax(0.0, height_sq));
  Point base = point(anchor1.x + ux * along, preferred.y, anchor1.z + uz * along);
  Point candidate1 = point(base.x - uz * height, base.y, base.z + ux * height);
  Point candidate2 = point(base.x + uz * height, base.y, base.z - ux * height);
  Point chosen = distance_points(candidate1, preferred) < distance_points(candidate2, preferred) ? candidate1 : candidate2;
  *error = round3(std::fmax(std::fabs(distance_points(chosen, anchor1) - length1),
                            std::fabs(distance_points(chosen, anchor2) - length2)));
  return point_key(chosen);
}

static LinkagePose compute_linkage(
    const Pose *pose,
    Point common_cal,
    const char *common_on,
    Point link1_anchor_cal,
    const char *link1_on,
    double link1_length,
    Point link2_anchor_cal,
    const char *link2_on,
    double link2_length) {
  LinkagePose linkage;
  linkage.link1_anchor = point_on_pose_segment(pose, link1_anchor_cal, link1_on);
  linkage.link2_anchor = point_on_pose_segment(pose, link2_anchor_cal, link2_on);
  linkage.preferred = point_on_pose_segment(pose, common_cal, common_on);
  linkage.common = solve_fixed_link_common(
      linkage.link1_anchor,
      link1_length,
      linkage.link2_anchor,
      link2_length,
      linkage.preferred,
      &linkage.error);
  linkage.link1_actual = distance_points(linkage.common, linkage.link1_anchor);
  linkage.link2_actual = distance_points(linkage.common, linkage.link2_anchor);
  return linkage;
}

static ActuatorPose actuator(Point tail, Point front) {
  ActuatorPose result = {tail, front, distance_points(tail, front)};
  return result;
}

static Pose compute_pose(State raw_state) {
  Pose pose;
  pose.state = clamp_state(raw_state);
  pose.absolute_angles = absolute_angles_for_state(pose.state);
  const double arm1_len = arm_length(JOINT_BASE_ARM1, JOINT_ARM1_ARM2);
  const double arm2_len = arm_length(JOINT_ARM1_ARM2, JOINT_ARM2_ARM3);
  const double arm3_len = arm_length(JOINT_ARM2_ARM3, JOINT_ARM3_TOOL);

  pose.joints[0] = JOINT_BASE_ARM1;
  pose.joints[1] = transform_local_point(pose.joints[0], pose.absolute_angles.arm1, point(arm1_len, 0.0, 0.0));
  pose.joints[2] = transform_local_point(pose.joints[1], pose.absolute_angles.arm2, point(arm2_len, 0.0, 0.0));
  pose.joints[3] = transform_local_point(pose.joints[2], pose.absolute_angles.arm3, point(arm3_len, 0.0, 0.0));
  pose.tool_center = transform_local_point(pose.joints[3], pose.absolute_angles.tool, point(TOOL_LENGTH_MM, 0.0, 0.0));

  pose.linkage_a = compute_linkage(
      &pose,
      LINK_A_COMMON_CAL,
      "arm2",
      LINK_A1_ANCHOR_CAL,
      "arm1",
      LINK_A1_LENGTH,
      LINK_A2_ANCHOR_CAL,
      "arm2",
      LINK_A2_LENGTH);
  pose.linkage_b = compute_linkage(
      &pose,
      LINK_B_COMMON_CAL,
      "arm3",
      LINK_B1_ANCHOR_CAL,
      "arm2",
      LINK_B1_LENGTH,
      LINK_B2_ANCHOR_CAL,
      "arm3",
      LINK_B2_LENGTH);

  pose.actuator1 = actuator(ACT1_TAIL, point_on_pose_segment(&pose, ACT1_FRONT_CAL, "arm1"));
  pose.actuator2 = actuator(point_on_pose_segment(&pose, ACT2_TAIL_CAL, "arm1"), pose.linkage_a.common);
  pose.actuator3 = actuator(point_on_pose_segment(&pose, ACT3_TAIL_CAL, "arm2"), pose.linkage_b.common);
  return pose;
}

static Point world_displayed_tool_point_for_state(State state) {
  Pose pose = compute_pose(state);
  Point display_tip = point_add(pose.tool_center, DISPLAY_TOOL_OFFSET);
  return rotate_xy_around(display_tip, -pose.state.base, BASE_LINK_PIVOT);
}

static State state_from_actuator_strokes(double s1, double s2, double s3, State current) {
  State state = current;
  state.arm1 = LIMIT_ARM1.min + (LIMIT_ARM1.max - LIMIT_ARM1.min) * clamp(s1, 0.0, 1.0);
  state.arm2 = LIMIT_ARM2.max - (LIMIT_ARM2.max - LIMIT_ARM2.min) * clamp(s2, 0.0, 1.0);
  state.arm3 = LIMIT_ARM3.max - (LIMIT_ARM3.max - LIMIT_ARM3.min) * clamp(s3, 0.0, 1.0);
  return clamp_state(state);
}

static double solve_score(State state, State current, Point target) {
  Point display_tip = world_displayed_tool_point_for_state(state);
  double dx = display_tip.x - target.x;
  double dy = display_tip.y - target.y;
  double dz = display_tip.z - target.z;
  double continuity =
      std::fabs(angle_distance(state.arm1, current.arm1)) * 0.08 +
      std::fabs(angle_distance(state.arm2, current.arm2)) * 0.04 +
      std::fabs(angle_distance(state.arm3, current.arm3)) * 0.04 +
      std::fabs(angle_distance(state.base, current.base)) * 0.04;
  return std::sqrt(dx * dx + dy * dy + dz * dz) + continuity;
}

static State solve_state_for_world_displayed_tool_target(Point target, State current, double *error, int *reachable) {
  State candidate = clamp_state(current);
  const char *keys[] = {"arm1", "arm2", "arm3", "base"};
  double step = 16.0;
  double best_score = solve_score(candidate, current, target);

  for (int iteration = 0; iteration < 240; iteration++) {
    int improved = 0;
    for (int key_index = 0; key_index < 4; key_index++) {
      for (int direction_index = 0; direction_index < 2; direction_index++) {
        const double direction = direction_index == 0 ? -1.0 : 1.0;
        State next = candidate;
        if (strcmp(keys[key_index], "arm1") == 0) next.arm1 += direction * step;
        if (strcmp(keys[key_index], "arm2") == 0) next.arm2 += direction * step;
        if (strcmp(keys[key_index], "arm3") == 0) next.arm3 += direction * step;
        if (strcmp(keys[key_index], "base") == 0) next.base = wrap_degrees(next.base + direction * step);
        next = clamp_state(next);
        double next_score = solve_score(next, current, target);
        if (next_score + 0.001 < best_score) {
          candidate = next;
          best_score = next_score;
          improved = 1;
        }
      }
    }
    if (!improved) step *= 0.62;
    if (step < 0.05) break;
  }

  *error = solve_score(candidate, current, target);
  *reachable = best_score < 35.0;
  return candidate;
}

static void print_point(const char *label, Point p) {
  printf("%s: x=%.3f y=%.3f z=%.3f\n", label, p.x, p.y, p.z);
}

static void print_state(State state) {
  printf("state: arm1=%.3f arm2=%.3f arm3=%.3f offset=%.3f base=%.3f\n",
         state.arm1, state.arm2, state.arm3, state.offset, state.base);
}

static void print_pose(Pose pose) {
  print_state(pose.state);
  printf("absolute_angles: arm1=%.3f arm2=%.3f arm3=%.3f tool=%.3f\n",
         pose.absolute_angles.arm1,
         pose.absolute_angles.arm2,
         pose.absolute_angles.arm3,
         pose.absolute_angles.tool);
  print_point("joint_base_arm1", pose.joints[0]);
  print_point("joint_arm1_arm2", pose.joints[1]);
  print_point("joint_arm2_arm3", pose.joints[2]);
  print_point("joint_arm3_tool", pose.joints[3]);
  print_point("tool_center", pose.tool_center);
  print_point("displayed_tip", world_displayed_tool_point_for_state(pose.state));
  printf("linkage_A_common: x=%.3f y=%.3f z=%.3f error=%.3f\n",
         pose.linkage_a.common.x, pose.linkage_a.common.y, pose.linkage_a.common.z, pose.linkage_a.error);
  printf("linkage_B_common: x=%.3f y=%.3f z=%.3f error=%.3f\n",
         pose.linkage_b.common.x, pose.linkage_b.common.y, pose.linkage_b.common.z, pose.linkage_b.error);
  printf("actuator1_length: %.3f\n", pose.actuator1.length);
  printf("actuator2_length: %.3f\n", pose.actuator2.length);
  printf("actuator3_length: %.3f\n", pose.actuator3.length);
}

static double arg_double(const char *value) {
  char *end = NULL;
  double parsed = strtod(value, &end);
  if (end == value || *end != '\0') {
    fprintf(stderr, "invalid number: %s\n", value);
    exit(2);
  }
  return parsed;
}

static State state_from_args(int argc, char **argv, int start) {
  State state = DEFAULT_STATE;
  if (argc > start) state.arm1 = arg_double(argv[start]);
  if (argc > start + 1) state.arm2 = arg_double(argv[start + 1]);
  if (argc > start + 2) state.arm3 = arg_double(argv[start + 2]);
  if (argc > start + 3) state.offset = arg_double(argv[start + 3]);
  if (argc > start + 4) state.base = arg_double(argv[start + 4]);
  return clamp_state(state);
}

static void print_usage(const char *program) {
  printf("SP-S C++ simulator\n");
  printf("usage:\n");
  printf("  %s pose [arm1 arm2 arm3 offset base]\n", program);
  printf("  %s preset calibration|folded\n", program);
  printf("  %s stroke arm1Stroke arm2Stroke arm3Stroke\n", program);
  printf("  %s linear targetX targetY targetZ [arm1 arm2 arm3 offset base]\n", program);
  printf("  %s path startX startY startZ endX endY endZ progressPercent [arm1 arm2 arm3 offset base]\n", program);
  printf("\nAll distances are millimeters. Angles are degrees. Strokes are normalized 0..1.\n");
}

int main(int argc, char **argv) {
  const char *mode = argc > 1 ? argv[1] : "pose";

  if (strcmp(mode, "--help") == 0 || strcmp(mode, "-h") == 0 || strcmp(mode, "help") == 0) {
    print_usage(argv[0]);
    return 0;
  }

  if (strcmp(mode, "pose") == 0) {
    print_pose(compute_pose(state_from_args(argc, argv, 2)));
    return 0;
  }

  if (strcmp(mode, "preset") == 0) {
    State state = DEFAULT_STATE;
    if (argc < 3) {
      fprintf(stderr, "preset requires calibration or folded\n");
      return 2;
    }
    if (strcmp(argv[2], "calibration") == 0) {
      state = State{90.0, 90.0, 90.0, 0.0, 0.0};
    } else if (strcmp(argv[2], "folded") == 0) {
      state = State{0.0, 180.0, 180.0, 0.0, 180.0};
    } else {
      fprintf(stderr, "unknown preset: %s\n", argv[2]);
      return 2;
    }
    print_pose(compute_pose(state));
    return 0;
  }

  if (strcmp(mode, "stroke") == 0) {
    if (argc < 5) {
      fprintf(stderr, "stroke requires arm1 arm2 arm3 normalized values\n");
      return 2;
    }
    State state = state_from_actuator_strokes(arg_double(argv[2]), arg_double(argv[3]), arg_double(argv[4]), DEFAULT_STATE);
    print_pose(compute_pose(state));
    return 0;
  }

  if (strcmp(mode, "linear") == 0) {
    if (argc < 5) {
      fprintf(stderr, "linear requires targetX targetY targetZ\n");
      return 2;
    }
    Point target = point(arg_double(argv[2]), arg_double(argv[3]), arg_double(argv[4]));
    State current = state_from_args(argc, argv, 5);
    double error = 0.0;
    int reachable = 0;
    State solved = solve_state_for_world_displayed_tool_target(target, current, &error, &reachable);
    printf("reachable: %s\n", reachable ? "yes" : "no");
    printf("solve_error: %.3f\n", error);
    print_pose(compute_pose(solved));
    return 0;
  }

  if (strcmp(mode, "path") == 0) {
    if (argc < 9) {
      fprintf(stderr, "path requires startX startY startZ endX endY endZ progressPercent\n");
      return 2;
    }
    Point start = point(arg_double(argv[2]), arg_double(argv[3]), arg_double(argv[4]));
    Point end = point(arg_double(argv[5]), arg_double(argv[6]), arg_double(argv[7]));
    double progress = clamp(arg_double(argv[8]), 0.0, 100.0);
    double t = progress / 100.0;
    Point target = point(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t);
    State current = state_from_args(argc, argv, 9);
    double error = 0.0;
    int reachable = 0;
    State solved = solve_state_for_world_displayed_tool_target(target, current, &error, &reachable);
    printf("path_distance: %.3f\n", distance_points(start, end));
    printf("path_progress: %.3f\n", progress);
    printf("reachable: %s\n", reachable ? "yes" : "no");
    printf("solve_error: %.3f\n", error);
    print_point("path_target", target);
    print_pose(compute_pose(solved));
    return 0;
  }

  fprintf(stderr, "unknown mode: %s\n", mode);
  print_usage(argv[0]);
  return 2;
}
