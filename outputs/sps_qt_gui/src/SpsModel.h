#pragma once

#include <array>
#include <map>
#include <string>
#include <vector>

namespace sps {

struct Point {
  double x = 0.0;
  double y = 0.0;
  double z = 0.0;
};

struct State {
  double arm1 = 90.0;
  double arm2 = 90.0;
  double arm3 = 90.0;
  double offset = 0.0;
  double base = 180.0;
};

struct Angles {
  double arm1 = 0.0;
  double arm2 = 0.0;
  double arm3 = 0.0;
  double tool = 0.0;
};

struct Segment {
  std::string key;
  Point start;
  Point end;
  double angle = 0.0;
};

struct LinkagePose {
  Point common;
  Point preferred;
  Point link1Anchor;
  Point link2Anchor;
  double error = 0.0;
  double link1Actual = 0.0;
  double link2Actual = 0.0;
};

struct ActuatorPose {
  Point tail;
  Point front;
  double length = 0.0;
};

struct Pose {
  State state;
  Angles absoluteAngles;
  std::array<Point, 4> joints;
  std::vector<Segment> segments;
  Point toolCenter;
  Point displayedTip;
  LinkagePose linkageA;
  LinkagePose linkageB;
  ActuatorPose actuator1;
  ActuatorPose actuator2;
  ActuatorPose actuator3;
};

struct LinearSolve {
  State state;
  Pose pose;
  Point target;
  double error = 0.0;
  bool reachable = false;
};

extern const State kDefaultState;
extern const Point kDisplayToolOffset;

double distance(Point a, Point b);
State clampState(State state);
State presetState(const std::string &key, State current = kDefaultState);
State stateFromActuatorStrokes(double arm1Stroke, double arm2Stroke, double arm3Stroke, State current = kDefaultState);
Pose computePose(State rawState);
Point worldDisplayedToolPointForState(State rawState);
LinearSolve solveStateForWorldDisplayedToolTarget(Point targetWorld, State currentState = kDefaultState);
Point lerp(Point a, Point b, double t);

}  // namespace sps
