var express = require('express');
var request = require('request');
var rp = require('request-promise');


function init(params) {

    /**
     * Функция, записи координат и информации об операторе в сервис(формат JSON)
     */
    function createOperator(user) {
        return getOperators()
            .then(function (data) {
                return auditOperators(data, user)
            })
            .then(function (data) {
                return updateOperator(data)
            })
            .catch(function (data) {
                return saveOperator(data, params.urls.create)
            });
    }

    /**
     *обновляет получаемые координаты от оператора в сервисе.
     */
    function updateOperator(data) {
        return getOperator(data.attributes.id)
            .then(function (id) {
                var feature = id.features[0];
                data.attributes.OBJECTID = feature.attributes.OBJECTID;
                data.attributes.updateDate = Date.now();
                return sendInformationInService(data, params.urls.position);
            })
            .then(function () {
                return saveOperator(data, params.urls.tracking);
            });
    }

    /**
     * Вернуть информацию об операторах в формате json
     */
    function getOperators() {
        return new Promise(function (resolve) {
            var uri = params.urls.operators + "/query?where=1=1&outFields=*&f=pjson";
            rp({url: uri})
                .then(function (data) {
                    resolve(JSON.parse(data));
                });
        });
    }

    /**
     * Вернуть информацию только определенного оператора
     */
    function getOperator(data) {
        return new Promise(function (resolve) {
            var uri = params.urls.operators + "/query?where=id='" + data + "'" + "&outFields=*&f=pjson";
            rp({url: uri})
                .then(function (data) {
                    resolve(JSON.parse(data));
                });
        });
    }

    /**
     * Вернуть все координаты определенного оператора
     */
    function getTracingOperator(data) {
        return new Promise(function (resolve) {
            var uri = params.urls.track + "/query?where=id='" + data + "'" + "&outFields=*&f=pjson";
            rp({url: uri})
                .then(function (data) {
                    resolve(JSON.parse(data));
                });
        });
    }

    /**
     * создание или обновление данных оператора в зависимости от условия
     * @param data
     * @param user
     * @returns {Promise}
     */
    function auditOperators(data, user) {
        return new Promise(function (resolve, reject) {
            var features = data.features;
            for (var item in features) {
                if (features[item].attributes.id == user.id && features[item].attributes.operatorName == user.operatorName) {
                    console.log("Такой оператор существует, обновляем позицию");
                    user.OBJECTID = features[item].attributes.OBJECTID;
                    resolve(generateOperator(user));
                    return
                }
            }
            /**
             * создает запись в сервисе, если нету такого оператора
             */
            console.log("Такого оператора несуществует");
            reject(generateOperator(user));
        });
    }

    /**
     *формирует объект для записи в сервис (JSON)
     * @param data
     * @returns {{attributes: {id: *, operatorName: *, role: *, createdDate: number, updateDate: number, status: boolean}, geometry: {x: *, y: *}}}
     */
    function generateOperator(data) {
        return {
            attributes: {
                OBJECTID: data.OBJECTID,
                id: data.id,
                operatorName: data.id,
                updateDate: Date.now()
            },
            geometry: {
                x: data.x,
                y: data.y
            }
        };
    }

    /**
     * записывает объект в сервис
     * @param data
     * @param url
     * @returns {*}
     */
    function saveOperator(data, url) {
        return sendInformationInService(data, url);
    }

    /**
     * отправка полученных данных на сервис в формате JSON
     * @param data
     * @param url
     * @returns {*}
     */
    function sendInformationInService(data, url) {
        data = JSON.stringify([data]);
        return rp({
            uri: url,
            method: 'POST',
            form: {
                features: data,
                f: "pjson"
            },
            json: true
        })
            .then(function (data) {
                console.log("Ответ от сервиса:", data);
                return new Promise(function (resolve) {
                    resolve(data);
                })
            })
            .catch(function (err) {
                console.log(err);
                return new Promise(function (resolve) {
                    resolve(data);
                })
            });
    }

    return {
        createOperator: createOperator,
        updateOperator: updateOperator,
        getOperator: getOperator,
        getOperators: getOperators,
        getTracingOperator: getTracingOperator
    };
}

module.exports = init;