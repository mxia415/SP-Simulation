#import <Cocoa/Cocoa.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <string>

namespace Sim {

constexpr double kPi = 3.14159265358979323846;

struct Point {
  double x;
  double y;
  double z;
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
  Point link1Anchor;
  Point link2Anchor;
  double error;
};

struct Pose {
  State state;
  Angles absoluteAngles;
  std::array<Point, 4> joints;
  Point toolCenter;
  Point displayedTip;
  LinkagePose linkageA;
  LinkagePose linkageB;
  double actuator1Length;
  double actuator2Length;
  double actuator3Length;
};

constexpr State kDefaultState{90.0, 90.0, 90.0, 0.0, 180.0};
constexpr Point kBaseLinkPivot{118.258, 0.0, 0.0};
constexpr Point kDisplayToolOffset{0.0, 262.0, 0.0};
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

double clamp(double value, double min, double max) {
  return std::clamp(value, min, max);
}

double round3(double value) {
  return std::round(value * 1000.0) / 1000.0;
}

Point point(double x, double y, double z) {
  return Point{x, y, z};
}

Point pointKey(Point p) {
  return point(round3(p.x), round3(p.y), round3(p.z));
}

double distance(Point a, Point b) {
  const double dx = a.x - b.x;
  const double dy = a.y - b.y;
  const double dz = a.z - b.z;
  return std::sqrt(dx * dx + dy * dy + dz * dz);
}

Point rotateXZ(Point p, double degrees) {
  const double angle = degrees * kPi / 180.0;
  return point(p.x * std::cos(angle) - p.z * std::sin(angle), p.y, p.x * std::sin(angle) + p.z * std::cos(angle));
}

Point rotateXYAround(Point p, double degrees, Point pivot) {
  const double angle = degrees * kPi / 180.0;
  const double x = p.x - pivot.x;
  const double y = p.y - pivot.y;
  return pointKey(point(pivot.x + x * std::cos(angle) - y * std::sin(angle), pivot.y + x * std::sin(angle) + y * std::cos(angle), p.z));
}

Point transformLocalPoint(Point origin, double angleDegrees, Point local) {
  Point rotated = rotateXZ(local, angleDegrees);
  return pointKey(point(origin.x + rotated.x, origin.y + rotated.y, origin.z + rotated.z));
}

State clampState(State state) {
  return State{
      clamp(state.arm1, 0.0, 120.0),
      clamp(state.arm2, 0.0, 180.0),
      clamp(state.arm3, 0.0, 180.0),
      clamp(state.offset, -270.0, 210.0),
      clamp(state.base, -180.0, 180.0),
  };
}

Angles absoluteAnglesForState(State rawState) {
  State state = clampState(rawState);
  return Angles{state.arm1, state.arm1 - state.arm2, state.arm1 - state.arm2 - state.arm3, state.arm1 - state.arm2 - state.arm3 - state.offset};
}

Point calibrationOrigin(const std::string &segment) {
  if (segment == "arm1") return kJointBaseArm1;
  if (segment == "arm2") return kJointArm1Arm2;
  if (segment == "arm3") return kJointArm2Arm3;
  return kJointArm3Tool;
}

double calibrationAngle(const std::string &segment) {
  Angles angles = absoluteAnglesForState(kDefaultState);
  if (segment == "arm1") return angles.arm1;
  if (segment == "arm2") return angles.arm2;
  if (segment == "arm3") return angles.arm3;
  return angles.tool;
}

Point localFromWorldAtCalibration(Point worldPoint, const std::string &segment) {
  Point origin = calibrationOrigin(segment);
  Point relative = point(worldPoint.x - origin.x, worldPoint.y - origin.y, worldPoint.z - origin.z);
  return transformLocalPoint(point(0.0, 0.0, 0.0), -calibrationAngle(segment), relative);
}

Point frameOrigin(const Pose &pose, const std::string &segment) {
  if (segment == "arm1") return pose.joints[0];
  if (segment == "arm2") return pose.joints[1];
  if (segment == "arm3") return pose.joints[2];
  return pose.joints[3];
}

double frameAngle(const Pose &pose, const std::string &segment) {
  if (segment == "arm1") return pose.absoluteAngles.arm1;
  if (segment == "arm2") return pose.absoluteAngles.arm2;
  if (segment == "arm3") return pose.absoluteAngles.arm3;
  return pose.absoluteAngles.tool;
}

Point pointOnPoseSegment(const Pose &pose, Point worldAtCalibration, const std::string &segment) {
  Point local = localFromWorldAtCalibration(worldAtCalibration, segment);
  return transformLocalPoint(frameOrigin(pose, segment), frameAngle(pose, segment), local);
}

Point solveFixedLinkCommon(Point anchor1, double length1, Point anchor2, double length2, Point preferred, double &error) {
  const double dx = anchor2.x - anchor1.x;
  const double dz = anchor2.z - anchor1.z;
  const double distanceXZ = std::sqrt(dx * dx + dz * dz);
  if (distanceXZ < 0.001) {
    error = std::max(std::fabs(distance(preferred, anchor1) - length1), std::fabs(distance(preferred, anchor2) - length2));
    return pointKey(preferred);
  }
  const double ux = dx / distanceXZ;
  const double uz = dz / distanceXZ;
  const double along = (length1 * length1 - length2 * length2 + distanceXZ * distanceXZ) / (2.0 * distanceXZ);
  const double height = std::sqrt(std::max(0.0, length1 * length1 - along * along));
  Point base = point(anchor1.x + ux * along, preferred.y, anchor1.z + uz * along);
  Point candidateA = point(base.x - uz * height, base.y, base.z + ux * height);
  Point candidateB = point(base.x + uz * height, base.y, base.z - ux * height);
  Point chosen = distance(candidateA, preferred) < distance(candidateB, preferred) ? candidateA : candidateB;
  error = round3(std::max(std::fabs(distance(chosen, anchor1) - length1), std::fabs(distance(chosen, anchor2) - length2)));
  return pointKey(chosen);
}

LinkagePose computeLinkage(const Pose &pose, Point commonCal, const std::string &commonOn, Point link1Cal, const std::string &link1On, double link1Length, Point link2Cal, const std::string &link2On, double link2Length) {
  LinkagePose linkage;
  linkage.link1Anchor = pointOnPoseSegment(pose, link1Cal, link1On);
  linkage.link2Anchor = pointOnPoseSegment(pose, link2Cal, link2On);
  Point preferred = pointOnPoseSegment(pose, commonCal, commonOn);
  linkage.common = solveFixedLinkCommon(linkage.link1Anchor, link1Length, linkage.link2Anchor, link2Length, preferred, linkage.error);
  return linkage;
}

Pose computePose(State rawState) {
  Pose pose;
  pose.state = clampState(rawState);
  pose.absoluteAngles = absoluteAnglesForState(pose.state);
  pose.joints[0] = kJointBaseArm1;
  pose.joints[1] = transformLocalPoint(pose.joints[0], pose.absoluteAngles.arm1, point(distance(kJointBaseArm1, kJointArm1Arm2), 0.0, 0.0));
  pose.joints[2] = transformLocalPoint(pose.joints[1], pose.absoluteAngles.arm2, point(distance(kJointArm1Arm2, kJointArm2Arm3), 0.0, 0.0));
  pose.joints[3] = transformLocalPoint(pose.joints[2], pose.absoluteAngles.arm3, point(distance(kJointArm2Arm3, kJointArm3Tool), 0.0, 0.0));
  pose.toolCenter = transformLocalPoint(pose.joints[3], pose.absoluteAngles.tool, point(kToolLength, 0.0, 0.0));
  pose.displayedTip = rotateXYAround(point(pose.toolCenter.x + kDisplayToolOffset.x, pose.toolCenter.y + kDisplayToolOffset.y, pose.toolCenter.z + kDisplayToolOffset.z), -pose.state.base, kBaseLinkPivot);
  pose.linkageA = computeLinkage(pose, kLinkACommonCal, "arm2", kLinkA1AnchorCal, "arm1", kLinkA1Length, kLinkA2AnchorCal, "arm2", kLinkA2Length);
  pose.linkageB = computeLinkage(pose, kLinkBCommonCal, "arm3", kLinkB1AnchorCal, "arm2", kLinkB1Length, kLinkB2AnchorCal, "arm3", kLinkB2Length);
  pose.actuator1Length = distance(kAct1Tail, pointOnPoseSegment(pose, kAct1FrontCal, "arm1"));
  pose.actuator2Length = distance(pointOnPoseSegment(pose, kAct2TailCal, "arm1"), pose.linkageA.common);
  pose.actuator3Length = distance(pointOnPoseSegment(pose, kAct3TailCal, "arm2"), pose.linkageB.common);
  return pose;
}

}  // namespace Sim

@interface StageView : NSView
@property(nonatomic) Sim::Pose pose;
@end

@implementation StageView

- (instancetype)initWithFrame:(NSRect)frameRect {
  self = [super initWithFrame:frameRect];
  if (self) {
    _pose = Sim::computePose(Sim::kDefaultState);
    self.wantsLayer = YES;
    self.layer.backgroundColor = [NSColor blackColor].CGColor;
  }
  return self;
}

- (BOOL)isFlipped {
  return YES;
}

- (void)setPose:(Sim::Pose)pose {
  _pose = pose;
  [self setNeedsDisplay:YES];
}

- (NSPoint)screenPointForWorld:(Sim::Point)p scale:(double)scale centerX:(double)centerX baseZ:(double)baseZ {
  return NSMakePoint(centerX + p.x * scale, baseZ - p.z * scale);
}

- (void)strokeLineFrom:(Sim::Point)a to:(Sim::Point)b color:(NSColor *)color width:(CGFloat)width scale:(double)scale centerX:(double)centerX baseZ:(double)baseZ {
  NSBezierPath *path = [NSBezierPath bezierPath];
  [path moveToPoint:[self screenPointForWorld:a scale:scale centerX:centerX baseZ:baseZ]];
  [path lineToPoint:[self screenPointForWorld:b scale:scale centerX:centerX baseZ:baseZ]];
  [color setStroke];
  path.lineWidth = width;
  [path stroke];
}

- (void)drawJoint:(Sim::Point)p color:(NSColor *)color radius:(CGFloat)radius scale:(double)scale centerX:(double)centerX baseZ:(double)baseZ {
  NSPoint point = [self screenPointForWorld:p scale:scale centerX:centerX baseZ:baseZ];
  NSRect rect = NSMakeRect(point.x - radius, point.y - radius, radius * 2.0, radius * 2.0);
  [color setFill];
  [[NSBezierPath bezierPathWithOvalInRect:rect] fill];
}

- (void)drawRect:(NSRect)dirtyRect {
  (void)dirtyRect;
  [[NSColor blackColor] setFill];
  NSRectFill(self.bounds);

  NSDictionary *smallAttrs = @{NSFontAttributeName : [NSFont systemFontOfSize:12 weight:NSFontWeightMedium], NSForegroundColorAttributeName : [NSColor colorWithWhite:0.82 alpha:1.0]};
  [@"GH Chain" drawAtPoint:NSMakePoint(22, 18) withAttributes:smallAttrs];
  NSString *chain = [NSString stringWithFormat:@"%.0f / %.0f / %.0f / %.0f / %.0f", _pose.state.arm1, _pose.state.arm2, _pose.state.arm3, _pose.state.offset, _pose.state.base];
  [chain drawAtPoint:NSMakePoint(22, 38) withAttributes:@{NSFontAttributeName : [NSFont monospacedDigitSystemFontOfSize:18 weight:NSFontWeightBold], NSForegroundColorAttributeName : [NSColor whiteColor]}];

  const double scale = std::min(self.bounds.size.width / 7200.0, self.bounds.size.height / 5200.0);
  const double centerX = self.bounds.size.width * 0.43;
  const double baseZ = self.bounds.size.height * 0.86;

  [[NSColor colorWithWhite:0.16 alpha:1.0] setStroke];
  for (int i = 0; i < 12; i++) {
    CGFloat y = baseZ - i * 400.0 * scale;
    NSBezierPath *line = [NSBezierPath bezierPath];
    [line moveToPoint:NSMakePoint(0, y)];
    [line lineToPoint:NSMakePoint(self.bounds.size.width, y)];
    line.lineWidth = 1.0;
    [line stroke];
  }

  NSColor *armColor = [NSColor colorWithCalibratedRed:0.50 green:0.73 blue:1.0 alpha:1.0];
  NSColor *toolColor = [NSColor colorWithCalibratedRed:0.34 green:0.95 blue:0.71 alpha:1.0];
  NSColor *actuatorColor = [NSColor colorWithCalibratedRed:1.0 green:0.72 blue:0.32 alpha:1.0];
  NSColor *linkColor = [NSColor colorWithCalibratedRed:0.78 green:0.62 blue:1.0 alpha:1.0];

  [self strokeLineFrom:_pose.joints[0] to:_pose.joints[1] color:armColor width:8 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.joints[1] to:_pose.joints[2] color:armColor width:8 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.joints[2] to:_pose.joints[3] color:armColor width:8 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.joints[3] to:_pose.toolCenter color:toolColor width:6 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:Sim::kAct1Tail to:Sim::pointOnPoseSegment(_pose, Sim::kAct1FrontCal, "arm1") color:actuatorColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:Sim::pointOnPoseSegment(_pose, Sim::kAct2TailCal, "arm1") to:_pose.linkageA.common color:actuatorColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:Sim::pointOnPoseSegment(_pose, Sim::kAct3TailCal, "arm2") to:_pose.linkageB.common color:actuatorColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.linkageA.link1Anchor to:_pose.linkageA.common color:linkColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.linkageA.link2Anchor to:_pose.linkageA.common color:linkColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.linkageB.link1Anchor to:_pose.linkageB.common color:linkColor width:3 scale:scale centerX:centerX baseZ:baseZ];
  [self strokeLineFrom:_pose.linkageB.link2Anchor to:_pose.linkageB.common color:linkColor width:3 scale:scale centerX:centerX baseZ:baseZ];

  for (const Sim::Point &joint : _pose.joints) {
    [self drawJoint:joint color:[NSColor whiteColor] radius:5 scale:scale centerX:centerX baseZ:baseZ];
  }
  [self drawJoint:_pose.toolCenter color:toolColor radius:6 scale:scale centerX:centerX baseZ:baseZ];

  NSString *tip = [NSString stringWithFormat:@"Tip XYZ  %.0f / %.0f / %.0f mm", _pose.displayedTip.x, _pose.displayedTip.y, _pose.displayedTip.z];
  [tip drawAtPoint:NSMakePoint(22, self.bounds.size.height - 42) withAttributes:@{NSFontAttributeName : [NSFont monospacedDigitSystemFontOfSize:15 weight:NSFontWeightBold], NSForegroundColorAttributeName : [NSColor whiteColor]}];
}

@end

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) StageView *stageView;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSTextField *> *readouts;
@property(nonatomic, strong) NSSlider *arm1Slider;
@property(nonatomic, strong) NSSlider *arm2Slider;
@property(nonatomic, strong) NSSlider *arm3Slider;
@property(nonatomic, strong) NSSlider *offsetSlider;
@property(nonatomic, strong) NSSlider *baseSlider;
@property(nonatomic) Sim::State state;
@end

@implementation AppDelegate

- (NSTextField *)label:(NSString *)text frame:(NSRect)frame fontSize:(CGFloat)fontSize weight:(NSFontWeight)weight {
  NSTextField *label = [[NSTextField alloc] initWithFrame:frame];
  label.stringValue = text;
  label.editable = NO;
  label.bezeled = NO;
  label.drawsBackground = NO;
  label.textColor = [NSColor colorWithWhite:0.92 alpha:1.0];
  label.font = [NSFont systemFontOfSize:fontSize weight:weight];
  return label;
}

- (NSButton *)button:(NSString *)title frame:(NSRect)frame action:(SEL)action {
  NSButton *button = [[NSButton alloc] initWithFrame:frame];
  button.title = title;
  button.bezelStyle = NSBezelStyleRounded;
  button.target = self;
  button.action = action;
  return button;
}

- (NSSlider *)sliderWithMin:(double)min max:(double)max value:(double)value frame:(NSRect)frame {
  NSSlider *slider = [[NSSlider alloc] initWithFrame:frame];
  slider.minValue = min;
  slider.maxValue = max;
  slider.doubleValue = value;
  slider.target = self;
  slider.action = @selector(sliderChanged:);
  return slider;
}

- (NSSlider *)addControlTo:(NSView *)panel title:(NSString *)title min:(double)min max:(double)max value:(double)value y:(CGFloat)y {
  [panel addSubview:[self label:title frame:NSMakeRect(22, y, 88, 22) fontSize:13 weight:NSFontWeightSemibold]];
  NSSlider *slider = [self sliderWithMin:min max:max value:value frame:NSMakeRect(104, y - 2, 174, 24)];
  [panel addSubview:slider];
  return slider;
}

- (void)addReadoutTo:(NSView *)panel key:(NSString *)key title:(NSString *)title y:(CGFloat)y {
  [panel addSubview:[self label:title frame:NSMakeRect(20, y, 170, 20) fontSize:12 weight:NSFontWeightRegular]];
  NSTextField *value = [self label:@"-" frame:NSMakeRect(20, y + 22, 220, 24) fontSize:15 weight:NSFontWeightBold];
  value.font = [NSFont monospacedDigitSystemFontOfSize:15 weight:NSFontWeightBold];
  self.readouts[key] = value;
  [panel addSubview:value];
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  (void)notification;
  self.state = Sim::kDefaultState;
  self.readouts = [NSMutableDictionary dictionary];

  self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(80, 80, 1280, 760) styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable) backing:NSBackingStoreBuffered defer:NO];
  self.window.title = @"SP-S模拟";
  self.window.minSize = NSMakeSize(1100, 680);

  NSView *root = self.window.contentView;
  root.wantsLayer = YES;
  root.layer.backgroundColor = [NSColor colorWithCalibratedRed:0.055 green:0.067 blue:0.078 alpha:1.0].CGColor;

  NSView *left = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 314, 760)];
  left.autoresizingMask = NSViewHeightSizable;
  left.wantsLayer = YES;
  left.layer.backgroundColor = [NSColor colorWithCalibratedRed:0.08 green:0.10 blue:0.12 alpha:1.0].CGColor;
  [root addSubview:left];

  self.stageView = [[StageView alloc] initWithFrame:NSMakeRect(314, 0, 706, 760)];
  self.stageView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  [root addSubview:self.stageView];

  NSView *right = [[NSView alloc] initWithFrame:NSMakeRect(1020, 0, 260, 760)];
  right.autoresizingMask = NSViewMinXMargin | NSViewHeightSizable;
  right.wantsLayer = YES;
  right.layer.backgroundColor = [NSColor colorWithCalibratedRed:0.075 green:0.085 blue:0.10 alpha:1.0].CGColor;
  [root addSubview:right];

  [left addSubview:[self label:@"GL-3DPRT-SP Simulation" frame:NSMakeRect(22, 24, 240, 18) fontSize:11 weight:NSFontWeightMedium]];
  [left addSubview:[self label:@"SP-S模拟" frame:NSMakeRect(22, 45, 180, 36) fontSize:28 weight:NSFontWeightBold]];
  [left addSubview:[self label:@"Native C++ · 2026-07-02" frame:NSMakeRect(22, 82, 220, 20) fontSize:12 weight:NSFontWeightRegular]];

  NSSegmentedControl *mode = [[NSSegmentedControl alloc] initWithFrame:NSMakeRect(22, 124, 270, 32)];
  mode.segmentCount = 3;
  [mode setLabel:@"角度驱动" forSegment:0];
  [mode setLabel:@"电缸行程" forSegment:1];
  [mode setLabel:@"线性驱动" forSegment:2];
  mode.selectedSegment = 0;
  [left addSubview:mode];

  self.arm1Slider = [self addControlTo:left title:@"臂1" min:0 max:120 value:self.state.arm1 y:198];
  self.arm2Slider = [self addControlTo:left title:@"臂2" min:0 max:180 value:self.state.arm2 y:248];
  self.arm3Slider = [self addControlTo:left title:@"臂3" min:0 max:180 value:self.state.arm3 y:298];
  self.offsetSlider = [self addControlTo:left title:@"打印头" min:-270 max:210 value:self.state.offset y:348];
  self.baseSlider = [self addControlTo:left title:@"旋转" min:-180 max:180 value:self.state.base y:398];

  [left addSubview:[self label:@"姿态预设" frame:NSMakeRect(22, 472, 160, 24) fontSize:16 weight:NSFontWeightBold]];
  [left addSubview:[self button:@"垂直姿态" frame:NSMakeRect(22, 510, 120, 34) action:@selector(calibrationPreset:)]];
  [left addSubview:[self button:@"折叠姿态" frame:NSMakeRect(158, 510, 120, 34) action:@selector(foldedPreset:)]];
  [left addSubview:[self button:@"恢复默认" frame:NSMakeRect(22, 558, 256, 34) action:@selector(defaultPreset:)]];

  [right addSubview:[self label:@"MODEL POSE" frame:NSMakeRect(20, 24, 160, 18) fontSize:11 weight:NSFontWeightMedium]];
  NSButton *ballStick = [[NSButton alloc] initWithFrame:NSMakeRect(18, 52, 210, 24)];
  ballStick.buttonType = NSButtonTypeSwitch;
  ballStick.title = @"显示所有球棍模型";
  ballStick.state = NSControlStateValueOn;
  [right addSubview:ballStick];
  [right addSubview:[self label:@"状态读数" frame:NSMakeRect(20, 106, 160, 26) fontSize:20 weight:NSFontWeightBold]];
  [self addReadoutTo:right key:@"chain" title:@"GH Chain" y:152];
  [self addReadoutTo:right key:@"tip" title:@"Tip XYZ" y:210];
  [self addReadoutTo:right key:@"angles" title:@"绝对角度" y:268];
  [self addReadoutTo:right key:@"actuators" title:@"电缸长度" y:326];
  [self addReadoutTo:right key:@"linkages" title:@"连杆误差" y:384];

  [self updateFromState];
  [self.window center];
  [self.window makeKeyAndOrderFront:nil];
  [NSApp activateIgnoringOtherApps:YES];
}

- (void)sliderChanged:(id)sender {
  (void)sender;
  self.state = Sim::clampState(Sim::State{self.arm1Slider.doubleValue, self.arm2Slider.doubleValue, self.arm3Slider.doubleValue, self.offsetSlider.doubleValue, self.baseSlider.doubleValue});
  [self updateFromState];
}

- (void)setSlidersFromState {
  self.arm1Slider.doubleValue = self.state.arm1;
  self.arm2Slider.doubleValue = self.state.arm2;
  self.arm3Slider.doubleValue = self.state.arm3;
  self.offsetSlider.doubleValue = self.state.offset;
  self.baseSlider.doubleValue = self.state.base;
}

- (void)defaultPreset:(id)sender {
  (void)sender;
  self.state = Sim::kDefaultState;
  [self setSlidersFromState];
  [self updateFromState];
}

- (void)calibrationPreset:(id)sender {
  (void)sender;
  self.state = Sim::State{90.0, 90.0, 90.0, 0.0, 0.0};
  [self setSlidersFromState];
  [self updateFromState];
}

- (void)foldedPreset:(id)sender {
  (void)sender;
  self.state = Sim::State{0.0, 180.0, 180.0, 0.0, 180.0};
  [self setSlidersFromState];
  [self updateFromState];
}

- (void)updateFromState {
  Sim::Pose pose = Sim::computePose(self.state);
  self.stageView.pose = pose;
  self.readouts[@"chain"].stringValue = [NSString stringWithFormat:@"%.0f / %.0f / %.0f / %.0f / %.0f", pose.state.arm1, pose.state.arm2, pose.state.arm3, pose.state.offset, pose.state.base];
  self.readouts[@"tip"].stringValue = [NSString stringWithFormat:@"%.0f / %.0f / %.0f mm", pose.displayedTip.x, pose.displayedTip.y, pose.displayedTip.z];
  self.readouts[@"angles"].stringValue = [NSString stringWithFormat:@"%.1f / %.1f / %.1f / %.1f", pose.absoluteAngles.arm1, pose.absoluteAngles.arm2, pose.absoluteAngles.arm3, pose.absoluteAngles.tool];
  self.readouts[@"actuators"].stringValue = [NSString stringWithFormat:@"%.0f / %.0f / %.0f mm", pose.actuator1Length, pose.actuator2Length, pose.actuator3Length];
  self.readouts[@"linkages"].stringValue = [NSString stringWithFormat:@"A %.3f / B %.3f", pose.linkageA.error, pose.linkageB.error];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
  (void)sender;
  return YES;
}

@end

int main(int argc, const char *argv[]) {
  (void)argc;
  (void)argv;
  @autoreleasepool {
    NSApplication *app = [NSApplication sharedApplication];
    AppDelegate *delegate = [[AppDelegate alloc] init];
    app.delegate = delegate;
    [app run];
  }
  return 0;
}
