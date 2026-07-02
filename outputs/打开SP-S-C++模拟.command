#!/bin/zsh
set -e

cd "$(dirname "$0")"

SRC="./sps_sim.cpp"
BIN="./sps_sim"

pause() {
  echo
  read "?按回车返回菜单..."
}

compile_program() {
  if ! command -v c++ >/dev/null 2>&1; then
    echo "未找到 C++ 编译器。"
    echo "请先安装 Apple 命令行工具：xcode-select --install"
    pause
    exit 1
  fi

  if [[ ! -x "$BIN" || "$SRC" -nt "$BIN" ]]; then
    echo "正在编译 SP-S C++ 模拟程序..."
    c++ -std=c++17 -Wall -Wextra -Werror -pedantic "$SRC" -o "$BIN"
    echo "编译完成。"
    echo
  fi
}

run_pose_with_input() {
  echo "请输入 5 个数值，单位为度："
  read "?臂1 arm1 [0..120]： " arm1
  read "?臂2 arm2 [0..180]： " arm2
  read "?臂3 arm3 [0..180]： " arm3
  read "?打印头 offset [-270..210]： " offset
  read "?旋转 base [-180..180]： " base
  echo
  "$BIN" pose "$arm1" "$arm2" "$arm3" "$offset" "$base"
}

run_stroke_with_input() {
  echo "请输入 3 个电缸归一化行程，范围 0..1："
  read "?电缸1： " s1
  read "?电缸2： " s2
  read "?电缸3： " s3
  echo
  "$BIN" stroke "$s1" "$s2" "$s3"
}

run_linear_with_input() {
  echo "请输入目标末端显示坐标，单位 mm："
  read "?X： " x
  read "?Y： " y
  read "?Z： " z
  echo
  "$BIN" linear "$x" "$y" "$z"
}

run_path_with_input() {
  echo "请输入起点、终点和路径进度，单位 mm / %："
  read "?起点 X： " sx
  read "?起点 Y： " sy
  read "?起点 Z： " sz
  read "?终点 X： " ex
  read "?终点 Y： " ey
  read "?终点 Z： " ez
  read "?进度百分比 0..100： " progress
  echo
  "$BIN" path "$sx" "$sy" "$sz" "$ex" "$ey" "$ez" "$progress"
}

compile_program

if [[ -n "$SPS_SIM_ONCE" ]]; then
  "$BIN" ${=SPS_SIM_ONCE}
  exit 0
fi

while true; do
  clear
  echo "SP-S C++ 模拟程序"
  echo "=================="
  echo "1. 默认姿态"
  echo "2. 垂直姿态预设"
  echo "3. 折叠姿态预设"
  echo "4. 输入角度计算"
  echo "5. 电缸行程驱动"
  echo "6. 线性目标求解"
  echo "7. 路径进度求解"
  echo "0. 退出"
  echo
  read "?请选择： " choice
  echo

  case "$choice" in
    1)
      "$BIN" pose
      pause
      ;;
    2)
      "$BIN" preset calibration
      pause
      ;;
    3)
      "$BIN" preset folded
      pause
      ;;
    4)
      run_pose_with_input
      pause
      ;;
    5)
      run_stroke_with_input
      pause
      ;;
    6)
      run_linear_with_input
      pause
      ;;
    7)
      run_path_with_input
      pause
      ;;
    0)
      echo "已退出。"
      exit 0
      ;;
    *)
      echo "无效选项。"
      pause
      ;;
  esac
done
