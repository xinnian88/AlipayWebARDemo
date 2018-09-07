<template>
    <div>
        <canvas class="preview-canvas" ref="canvasEl"></canvas>
        <img src="" class="pre-image" ref="preImage"/>
        <div class="face-rect" ref="faceRect">

        </div>
        <div class="control-buttons">
            <md-button class="md-raised md-primary" v-on:click="captureImage">拍照</md-button>
            <md-button class="md-raised md-primary" v-on:click="resumeCamera">重拍</md-button>
        </div>
    </div>
</template>

<script type='text/javascript'>
  import Vue from 'vue'
  import {MdButton} from 'vue-material/dist/components';
  import ap from '@alipay/alipayjsapi/lib/alipayjsapi.inc.js';
  const {
    AR_CANVAS_RESIZE,
    getWebCameraAsync,
    CAMERA_QUALITY_HIGH,
    CAMERA_FACING_FRONT,
    CAMERA_FACING_BACK,

    CONSTRAINT_NOT_SATISFIED_ERROR,
    ERROR_CODE_APP_CAMERA_PERMISSION_ALREADY_DENIED,
    ERROR_CODE_APP_CAMERA_PERMISSION_CURRENT_DENIED,
    ERROR_CODE_APP_WEBSITE_PERMISSION_DENIED,
    ERROR_CODE_RESOLUTION_NOT_SUPPORT,
    ERROR_CODE_NO_SPECIFIED_DEVICE,
    ERROR_CODE_CAMERA_OPEN_TIME_OUT,
    ERROR_CODE_CAMERA_OCCUPIED,
    ERROR_CODE_SYSTEM_NOT_SUPPORT,
    ERROR_CODE_INVALID_WEBGL_CONTEXT,
    // ERROR_CODE_NO_SPECIFIED_DETECTOR,
    NO_TAKE_PHOTO_FEATURE,
    FaceDetector
  } =  window.WebAR;
  import 'vue-material/dist/vue-material.min.css'

  Vue.use(MdButton)
  let devicePixelRatio = window.devicePixelRatio;
  export default {
    data() {
      return {
        cameraFacing: CAMERA_FACING_FRONT,
        isCameraOpened: false,
        camera: null,
        displayTarget: null,
        glContext: null,
        isCaptureImage: false,
        haveFace: false,
        hasNewDetectorData: false,
        frameSize: [],
        quality: [],
        threeJSData: {
          faceMatrix: [[]],
          faceRect: [[142, 157, 192, 316]],
          markerWidth: 134,
          markerHeight: 200
        },
        canvasELPos: {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          scale: 0
        }
      }
    },
    mounted() {
      this.openCamera = this.openCamera.bind(this);
      console.debug(this);
      this.openCamera.apply(this, []);
    },
    methods: {
      async openCamera () {
        const {clientWidth, clientHeight} = document.documentElement;
        console.debug(this);
        this.$refs['canvasEl'].width = clientWidth * window.devicePixelRatio;
        this.$refs['canvasEl'].height = clientHeight * window.devicePixelRatio;
        const glContext = this.$refs['canvasEl'].getContext('webgl');
        this.glContext = glContext;
        this.$refs['canvasEl'].addEventListener(AR_CANVAS_RESIZE, event => {
          this.coverCanvas(event, clientWidth, clientHeight);
          console.log('AR_CANVAS_RESIZE', event);
        });
        try {
          const camera = await getWebCameraAsync({
            facing: this.cameraFacing,
            quality: CAMERA_QUALITY_HIGH,
            // androidCameraFormat: 'nv21',
          });
          console.debug('androidCameraFormat nv21');
          this.camera = camera;
          await camera.openAsync(60*1000);
          this.isCameraOpened = true;
          // 配置并生成 displayTarget
          this.displayTarget = camera.createDisplayTarget(glContext, {
            autoResize: true,
            cameraSize: 'stretch'
          });
          // 绘制
          const draw = () => {
            this.displayTarget.render();
            window.requestAnimationFrame(draw);
          };
          window.requestAnimationFrame(draw);
          const faceDetector = await camera.setDetectorAsync(FaceDetector);
          this.bindDetector(faceDetector);
          console.debug(faceDetector);
        } catch (err) {
          console.error(err);
          if (err.code === CONSTRAINT_NOT_SATISFIED_ERROR.code) {
            // Android 相机分辨率设置 过高，导致设备不支持
            console.error(err, err.message, err.message.search(/ConstraintNotSatisfiedError/gi), this.camera);
            if (err && err.message.search(/ConstraintNotSatisfiedError/gi) !== -1) {
              if (devicePixelRatio > 1) {
                devicePixelRatio -= 1;
                localStorage.setItem('devicePixelRatio', devicePixelRatio);
                if (navigator.userAgent.search(/Chrome\/40\./gi) !== -1) {
                  location.reload();
                } else {
                  // console.log(that);
                  await this.camera.closeAsync();
                  await this.openCamera();
                }
              }
              return;
            }
          } else if (err.code === ERROR_CODE_APP_CAMERA_PERMISSION_ALREADY_DENIED.code) {
            // APP相机权限已被拒绝
          } else if (err.code === ERROR_CODE_APP_CAMERA_PERMISSION_CURRENT_DENIED.code) {
            // APP相机权限本次被拒绝
          } else if (err.code === ERROR_CODE_APP_WEBSITE_PERMISSION_DENIED.code) {
            // 网页权限被拒绝
          } else if (err.code === ERROR_CODE_RESOLUTION_NOT_SUPPORT.code) {
            // 相机分辨率不被支持
          } else if (err.code === ERROR_CODE_NO_SPECIFIED_DEVICE.code) {
            // 没有找到对应位置的摄像头
          } else if (err.code === ERROR_CODE_CAMERA_OPEN_TIME_OUT.code) {
            // 打开相机超时
          } else if (err.code === ERROR_CODE_CAMERA_OCCUPIED.code) {

            // 相机被占用
          } else if (err.code === ERROR_CODE_SYSTEM_NOT_SUPPORT.code) {
            // 系统版本不支持， ios 只支持 ios 10+, android 4.4+
          } else if (err.code === ERROR_CODE_INVALID_WEBGL_CONTEXT.code) {
            // webgl context 错误
          } else {
            // 未知错误
          }
        }
      },
      bindDetector(faceDetector){
        faceDetector.addEventListener(FaceDetector.EVENT_FACE_RECOGNIZED, data => {
          console.debug(data.faces);
          this.haveFace = true;
          this.hasNewDetectorData = true;
          // this.$refs['threeJSOverEl'].style.display = 'block';
          // this.$refs.faceRect.style.display = 'block';
          // console.log('haveFace', data);
          if (this.camera.resolution && this.camera.resolution[0] !== this.frameSize[0]) {
            this.frameSize[0] = this.camera.resolution[0];
            this.frameSize[1] = this.camera.resolution[1];
          }
          this.onReceiveData(data);
          if (!this.requestAnimationFrameId) {
            // this.drawFaceRectByTHREEJS(this.glContext, this.size.clientWidth, this.size.clientHeight);
          }
        })
        faceDetector.startRecognize();
      },
      onReceiveData(data) {
        this.threeJSData.faceMatrix = data.faceMatrix;
        this.threeJSData.faceRect = data.faceRect;
        this.threeJSData.markerWidth = data.markerHeight;
        this.threeJSData.markerHeight = data.markerWidth;
        if (this.canvasELPos.width) {
          this.quality[0] = this.frameSize[0];
          this.quality[1] = this.frameSize[1];
          if (data.faces && data.faces[0]) {
            const faceRect = data.faces[0].rect;

            const result = this.checkFaceRotate(faceRect, data.faces[0].matrix, data.markerWidth);
            if (result) {
              console.log('姿态正确');
              this.$refs.faceRect.style.display = 'block';
              this.drawFaceRect(this.glContext, faceRect, this.canvasELPos.width, this.canvasELPos.height);
            } else {
              this.$refs.faceRect.style.display = 'none';
              console.log('姿态不正确');
            }
          } else {
            this.$refs.faceRect.style.display = 'none';
            console.log('数据错误, 找不到faces');
          }
          this.hasNewDetectorData = false;
        }
      },
      // 检测 face 的 旋转角度
      checkFaceRotate(faceRect, faceMatrix, markerWidth) {
        const matrix = new THREE.Matrix4();
        const matrix4 = new THREE.Matrix4();
        if (faceMatrix instanceof ArrayBuffer) {
          faceMatrix = new Float32Array(faceMatrix);
        }
        if (this.cameraFacing === CAMERA_FACING_FRONT && this.hasNewDetectorData) {
          matrix4.set.apply(matrix4, faceMatrix);
          const percent = faceRect[2] / markerWidth;
          matrix4.transpose();
          matrix4.scale(new THREE.Vector3(percent, percent, percent));

          matrix4.multiply(new THREE.Matrix4().makeRotationX(180 * Math.PI / 180));
          matrix4.transpose();
          // matrix4.multiply(new THREE.Matrix4().makeRotationY(180 * Math.PI / 180));
          const matrix4Ele = matrix4.elements;
          if (matrix4Ele) {
            // faceMatrix[0][11] = 300 - faceMatrix[0][11] / scaleNumX;
            // matrix4Ele[3] = -matrix4Ele[3] / scaleNumX;
            // matrix4Ele[7] = -matrix4Ele[7] / scaleNumX;
          }
          // console.log(matrix4Ele[11], matrix4Ele[7]);
          matrix.set.apply(matrix, matrix4.elements);
          this.pacePosMatrix = matrix;
        } else if (this.cameraFacing === CAMERA_FACING_BACK && this.hasNewDetectorData) {
          matrix4.set.apply(matrix4, faceMatrix);
          const percent = faceRect[2] / markerWidth;
          matrix4.transpose();
          matrix4.scale(new THREE.Vector3(percent, percent, percent));
          matrix4.transpose();
          // OpenCV 坐标系 到 OpenGL 坐标系
          matrix4.multiply(new THREE.Matrix4().makeRotationX(180 * Math.PI / 180));
          // 镜像翻转
          matrix4.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
          const matrix4Ele = matrix4.elements;
          if (matrix4Ele) {
            // 增加预先估计的景深
            matrix4Ele[11] += 300;
          }
          // console.log(matrix4Ele[11], matrix4Ele[7]);
          matrix.set.apply(matrix, matrix4.elements);
          this.pacePosMatrix = matrix;
        }
        var line = new THREE.Line3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, -1)
        );
        line.applyMatrix4(matrix);
        const zAngle = line.end.angleTo(new THREE.Vector3(0, 0, -1)) * 180 / Math.PI;
        const xAngle = line.end.angleTo(new THREE.Vector3(1, 0, 0)) * 180 / Math.PI;
        const yAngle = line.end.angleTo(new THREE.Vector3(0, 1, 0)) * 180 / Math.PI;
        if (Math.abs(xAngle - 90) < 15 && Math.abs(yAngle - 90) < 15 && Math.abs(zAngle) < 15) {
          return true;
        } else {
          return false;
        }
      },
      async drawFaceRect (webgl, faceRect, width, height) {
        const el = this.$refs.faceRect;
        const scaleNumX = width / this.quality[0];
        const scaleNumY = height / this.quality[1];
        const position = {
          x: faceRect[0],
          y: faceRect[1]
        };
        el.style.width = faceRect[2] * scaleNumX + 'px';
        el.style.height = faceRect[3] * scaleNumY + 'px';
        // console.log(position.x, position.y, scaleNumX, scaleNumY);
        // 前置 后置摄像头，参数使用不一样
        if (this.cameraFacing === CAMERA_FACING_FRONT) {
          el.style.left = (width - faceRect[2] * scaleNumX - position.x * scaleNumX + this.canvasELPos.left) + 'px';
          el.style.top = position.y * scaleNumY + 'px';
        } else {
          el.style.left = (position.x * scaleNumX + this.canvasELPos.left) + 'px';
          el.style.top = position.y * scaleNumY + 'px';
        }
      },
      coverCanvas(event, bodyWidth, bodyHeight) {
        let {width, height} = event.data;
        if (width > height) {
          const temp = width;
          width = height;
          height = temp;
        }
        console.log(event.data, width, height, bodyWidth, bodyHeight);
        if (width / height > bodyWidth / bodyHeight) {
          const newCanvasWidth = width / height * bodyHeight;
          this.$refs['canvasEl'].style.position = 'relative';
          this.$refs['canvasEl'].style.height = bodyHeight + 'px';
          this.$refs['canvasEl'].style.width = newCanvasWidth + 'px';
          this.$refs['canvasEl'].style.left = (bodyWidth - newCanvasWidth) / 2 + 'px';
          this.$refs['canvasEl'].style.top = 0 + 'px';

          this.canvasELPos.left = (bodyWidth - newCanvasWidth) / 2;
          this.canvasELPos.top = 0;
          this.canvasELPos.width = newCanvasWidth;
          this.canvasELPos.height = bodyHeight;
          this.canvasELPos.scale = newCanvasWidth / bodyWidth;
        } else {
          const newCanvasHeight = height / width * bodyWidth;
          this.$refs['canvasEl'].style.position = 'relative';
          this.$refs['canvasEl'].style.height = newCanvasHeight + 'px';
          this.$refs['canvasEl'].style.width = bodyWidth + 'px';
          this.$refs['canvasEl'].style.top = (bodyHeight - newCanvasHeight) / 2 + 'px';

          this.canvasELPos.left = 0;
          this.canvasELPos.top = (bodyHeight - newCanvasHeight) / 2;
          this.canvasELPos.width = bodyWidth;
          this.canvasELPos.height = newCanvasHeight;
          this.canvasELPos.scale = newCanvasHeight / bodyHeight;
        }

        this.$refs.preImage.style.left = this.canvasELPos.left + 'px';
        this.$refs.preImage.style.width = this.canvasELPos.width + 'px';
        this.$refs.preImage.style.height = this.canvasELPos.height + 'px';
        console.log('canvasELPos::', this.canvasELPos);

        // this.$refs['canvasEl'].width = this.canvasELPos.width * window.devicePixelRatio;
        // this.$refs['canvasEl'].height = this.canvasELPos.height * window.devicePixelRatio;
      },
      async captureImage () {
        if (this.isCaptureImage) {
          return;
        }
        this.isCaptureImage = true;
        if (this.glContext) {
          if (this.camera) {
            this.$refs.preImage.style.display = 'block';
            console.debug('use ARSession.takePhoto');
            const pictureSizeArray = [2000, 3000];
            try {
              const dataUrl = await this.camera.takePhoto({
                imageWidth: pictureSizeArray[0],
                imageHeight: pictureSizeArray[1],
                // 最大图片宽度
                maxImageWidth: 1500
              });
              this.$refs.preImage.src = dataUrl;
              this.displayTarget.pause();
              // this.camera.closeAsync();
              this.isCaptureImage = false;
              console.debug(dataUrl.length);
              ap.saveImage(dataUrl);
            } catch (e) {
              console.error(e);
              // 不支持就自动fallback
              if (e.code === NO_TAKE_PHOTO_FEATURE.code) {
                this.displayTarget.snapshotImageDataURLAsync().then(dataURL => {
                  this.$refs.preImage.src = dataURL;
                  this.displayTarget.pause();
                  // this.camera.closeAsync();
                  this.isCaptureImage = false;
                }).catch(() => {
                  this.isCaptureImage = false;
                });
              } else {
                this.isCaptureImage = false;
              }
            }
          }
        }
      },
      async resumeCamera() {
        if (this.camera) {
          // await this.camera.openAsync();
          if (window.ARSession && window.ARSession.setCameraParameters) {
            // 为了使相机 startPreview 一次
            window.ARSession.setCameraParameters(true, {zoom: 0});
          }
          this.displayTarget.resume();
          this.$refs.preImage.style.display = 'none';
          this.$refs.preImage.src = '';
        }
      }
    },
    async beforeDestroy() {
      console.debug('take photo beforeDestroy');
      await this.camera.closeAsync();
    },
    components: {}
  }
</script>

<style lang="less" scoped>
    .pre-image, .preview-canvas {
        position: fixed;
        max-width: inherit;
        width: 100%;
        height: 100%;
        top: 0px;
        left: 0px;
    }

    .pre-image {
        z-index: 2;
    }

    .control-buttons {
        position: fixed;
        width: 100%;
        height: 100px;
        bottom: 0px;
        z-index: 3;
        background-color: #fff;
    }

    .face-rect {
        position: fixed;
        z-index: 4;
        top: 0;
        left: 0;
        width: 100px;
        height: 100px;
        border: 1px solid red;
        display: none;
    }
</style>
