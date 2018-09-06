import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import CaptureImage from './components/CaptureImage.vue';
import HelloWorld from './components/index.vue';

Vue.config.productionTip = false;

const routes = [
  { path: '/CaptureImage', component: CaptureImage },
  { path: '/', component: HelloWorld }
];
const router = new VueRouter({
  routes
});
Vue.use(VueRouter);
const root = new Vue({
  render: h => {
    return <App/>;
  },
  router,
  components: {
    'router-view': router
  }
}).$mount('#app');

console.debug(root);
