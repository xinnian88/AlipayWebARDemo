<template>
  <div>
    <md-list>
      <md-list-item>
        <md-button class="md-raised md-primary tiny-list-item" @click="gotoCapture">
          <span class="md-list-item-text">拍照能力</span>
        </md-button>
      </md-list-item>
    </md-list>
  </div>
</template>

<script type="text/javascript">
  import Vue from 'vue'
  import {MdList, MdIcon, MdDivider, MdAvatar, MdButton} from 'vue-material/dist/components'
  import 'vue-material/dist/vue-material.min.css'
  Vue.use(MdList)
  Vue.use(MdIcon)
  Vue.use(MdDivider)
  Vue.use(MdAvatar)
  Vue.use(MdButton)
  export default {
    name: 'HelloWorld',
    props: {
      msg: String
    },
    methods: {
      gotoCapture(){
        this.$router.push('/CaptureImage');
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .tiny-list-item {
    width: 90%;
    margin: 0px auto;
  }
</style>
