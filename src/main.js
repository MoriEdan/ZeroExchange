version = "0.1"

var $ = require("jquery");
var Hammer = require("hammerjs");
var Materialize = require("materialize-css/dist/js/materialize.min.js");

var ZeroFrame = require("./libs/ZeroFrame.js");
var Router = require("./libs/router.js");

var Vue = require("vue/dist/vue.min.js");

var VueZeroFrameRouter = require("./libs/vue-zeroframe-router.js");

var { sanitizeStringForUrl, sanitizeStringForUrl_SQL, html_substr, sanitizeHtmlForDb } = require("./util.js");

Vue.use(VueZeroFrameRouter.VueZeroFrameRouter);

// Vue Components
var Navbar = require("./vue_components/navbar.vue");

var app = new Vue({
	el: "#app",
	template: `<div>
			<component ref="navbar" :is="navbar"></component>
			<component ref="view" v-bind:is="currentView" v-on:show-signin-modal="showSigninModal()" v-on:get-user-info="getUserInfo()" v-bind:user-info="userInfo"></component>
		</div>`,
	data: {
		navbar: Navbar,
		currentView: null,
		siteInfo: null,
		userInfo: null,
		signin_modal_active: false
	},
	methods: {
		getUserInfo: function(f = null) { // TODO: This can be passed in a function as a callback
            if (this.siteInfo == null || this.siteInfo.cert_user_id == null) {
                this.userInfo = null;
                return;
            }

            var that = this;

            page.cmd("dbQuery", ["SELECT key, value FROM keyvalue LEFT JOIN json USING (json_id) WHERE cert_user_id=\"" + this.siteInfo.cert_user_id + "\" AND directory=\"users/" + this.siteInfo.auth_address + "\""], (rows) => {
                var keyvalue = {};

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    
                    keyvalue[row.key] = row.value;
                }
                if (!keyvalue.name || keyvalue.name === "") {
                    return;
                }
                that.userInfo = {
                    cert_user_id: that.siteInfo.cert_user_id,
                    auth_address: that.siteInfo.auth_address,
                    keyvalue: keyvalue
                };

                if (!keyvalue.languages || keyvalue.languages === "") { // TODO: Might not need this check (this was from ZeroMedium originally)
                    that.language_modal_active = true;
                    that.$on("setUserLanguages", (languages) => {
                        that.keyvalue.languages = languages;
                        cache_remove("home_topics");
                        that.$emit("setUserInfo", that.userInfo); // TODO: Not sure if I need this if I can pass in a function callback instead
                        if (f !== null && typeof f === "function") f();
                        if (Router.currentRoute == "") {
                            that.$refs.view.getTopics();
                        }
                        /*page.getTopics((topics) => {
                            console.log(topics);
                            cache_add("home_topics", topics);
                        });*/
                    });
                } else {
                    that.$emit("setUserInfo", that.userInfo); // TODO: Not sure if I need this if I can pass in a function callback instead
                    cache_remove("home_topics");
                    if (f !== null && typeof f === "function") f();
                    /*if (Router.currentRoute == "") {
                        that.$refs.view.getTopics();
                    }*/
                    /*page.getTopics((topics) => {
                        console.log(topics);
                        cache_add("home_topics", topics);
                    });*/
                }
            });
        }
	}
});

class ZeroApp extends ZeroFrame {
	onOpenWebsocket() {
		var self = this;

		this.cmdp("siteInfo", {})
			.then(siteInfo => {
				self.siteInfo = siteInfo;
				app.siteInfo = siteInfo;
				//app.getUserInfo();
				//self.cmdp("wrapperNotification", ["info", "Loaded!"]);
			});
	}

	onRequest(cmd, message) {
		if (cmd === "setSiteInfo") {
			this.siteInfo = message.params;
			app.siteInfo = message.params;
			//app.getUserInfo();
		}

		if (message.params.event[0] === "file_done") {
		}

		Router.listenForBack(cmd, message);
	}

	selectUser() {
		return this.cmdp("certSelect", { accepted_domains: ["zeroid.bit", "kaffie.bit", "cryptoid.bit"] });
    }

    signout() {
    	return this.cmdp("certSelect", { accepted_domains: [""] });
    }

    unimplemented() {
        return page.cmdp("wrapperNotification", ["info", "Unimplemented!"]);
    }
}

page = new ZeroApp();

var Home = require("./router_pages/app.vue");
var About = require("./router_pages/about.vue");

VueZeroFrameRouter.VueZeroFrameRouter_Init(Router, app, [
	{ route: "about", component: About },
	{ route: "", component: Home }
]);
