(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'khoaijs-event-emitter'
        ];

        define(dependencies, function (_, EventEmitter) {
            var args = Array.prototype.slice.call(arguments);
            var module = factory.apply(null, args);

            if (require.specified('khoaijs')) {
                require(['khoaijs'], function (Khoai) {
                    Khoai.Store = module;
                });
            }

            root.Store = module;

            return module;
        });
    } else {
        var module = factory(
            root._,
            (root.Khoai && root.Khoai.EventEmitter) || root.EventEmitter
        );

        if (root.Khoai) {
            root.Khoai.Store = module;
        }

        root.Store = module;
    }
}(this, function (_, EventEmitter) {

    function Store(init_data) {
        EventEmitter.call(this);

        this.name = '';
        this.data = _.isObject(init_data) ? _.clone(init_data) : {};
        this.stores = {};

        this.addListener('change', pushChangeToOtherStores, 1000);
    }

    Store.prototype = Object.create(EventEmitter.prototype);
    Store.prototype.constructor = Store;

    Store.prototype.getStoreKey = function () {
        return this.name || this.id;
    };
    Store.prototype.shouldChange = function () {
        return true;
    };
    Store.prototype.changeSilent = function (dataName, dataValue) {
        var self = this;
        var data = {};

        if (_.isObject(dataName)) {
            data = dataName;
        } else {
            data[dataName] = dataValue;
        }

        _.each(data, function (value, path) {
            _.set(self.data, path, value);
        });
    };

    Store.prototype.change = function (dataName, dataValue) {
        var old_data = _.cloneDeep(this.data);

        this.changeSilent.apply(this, arguments);

        if (!this.shouldChange()) {
            return;
        }

        this.emitEvent('change', {
            old_data: old_data,
            new_data: this.getData()
        });
    };

    Store.prototype.triggerChange = function () {
        var data = this.getData();

        this.emitEvent('change', {
            old_data: _.cloneDeep(data),
            new_data: _.cloneDeep(data)
        });
    };

    Store.prototype.getData = function () {
        return _.cloneDeep(this.data);
    };

    /**
     * Get data value
     * @param {string} name
     * @param {*} [default_value]
     * @returns {*|null}
     */
    Store.prototype.get = function (name, default_value) {
        if (this.hasData(name)) {
            var value = this.data[name];

            return _.isObject(value) ? _.cloneDeep(value) : value;
        }

        return arguments.length > 1 ? default_value : null;
    };

    /**
     * @param {string} name
     * @return {boolean}
     */
    Store.prototype.hasData = function (name) {
        return this.data.hasOwnProperty(name);
    };

    /**
     * @param {string|array} names
     * @return {boolean}
     */
    Store.prototype.remove = function (names) {
        names = _.castArray(names);

        this.data = _.omit(this.data, names);

        this.triggerChange();
    };

    /**
     * @param {{}} [data = {}]
     */
    Store.prototype.reset = function (data) {
        this.data = data || {};

        this.triggerChange();
    };

    /**
     * Connect to other Store
     * @param {Store} store
     */
    Store.prototype.connect = function (store) {
        if (!(store instanceof Store)) {
            throw new Error("Target store isn't an instance of Store");
        }

        var storeKey = store.getStoreKey();

        if (this.stores.hasOwnProperty(storeKey)) {
            return false;
        }

        this.stores[storeKey] = store;
        this.emitEvent('connect_store', storeKey, store);

        return true;
    };

    function pushChangeToOtherStores() {
        if (_.isEmpty(this.stores)) {
            return;
        }

        var thisStoreKey = this.getStoreKey();
        var data = this.getData();

        _.each(this.stores, function (store) {
            store.change(thisStoreKey, data);
        });
    }


    return Store;
}));
