
import errorCodes from './errorCodes.js';

function Metamask() {
    var isLoaded = false;
    var deniedTransactionSignature = "User denied transaction signature";

    //проверяет есть ли коннект к метамаску (инжекнута ли им web3)
    var _checkWeb3 = function () {
        return window.web3 && window.web3.eth;
    }

    //обрабатывает ошибки после отправки транзакции в метамаск
    var _processError = function (error) {
        if (error.message && error.message.includes(deniedTransactionSignature)) {
            return errorCodes.metamaskReject;
        }
        if (error.message && error.message.includes(deniedMessageSignature)) {
            return errorCodes.metamaskMessageSignReject;
        } else {
            return errorCodes.unknownError;
        }
    }

    //устанавливает точное значение газ лимита для метамаска
    var _setGasLimit = function (transaction) {
        //чтобы метамаск корректно понял переданное значение gasLimit и не пересчитвал его сам - нужно установить параметр gas в транзакции в нужное число
        transaction.gas = transaction.gasLimit;
        return transaction;
    }



    this.decrypt = function () {
        return new Promise(function (resolve, reject) {
            // web3 not suport
            //  https://docs.metamask.io/guide/provider-migration.html#replacing-window-web3
            // if (window.ethereum && !isLoaded) {
            //     window.web3 = new Web3(ethereum);
            //     isLoaded = true;
            // }
            if (window.ethereum) {
                ethereum.enable()
                    .then(() => {
                        _decrypt()
                            .then(account => {
                                resolve(account);
                            })
                            .catch(error => {
                                reject(error);
                            })
                    })
                    .catch(() => {
                        //если пользователь отменил, то скидываем прогрузку, чтобы запросить повторно
                        isLoaded = false;
                        reject(errorCodes.metamaskRejectAccess);
                    })
            } else {
                _decrypt()
                    .then(account => {
                        resolve(account);
                    })
                    .catch(error => {
                        reject(error);
                    })
            }
        })
    }

    var _decrypt = function () {
        return new Promise(function (resolve, reject) {
            if (_checkWeb3()) {
                window.web3.eth.getAccounts(function (err, accounts) {
                    if (err || !accounts.length) {
                        reject(errorCodes.metamaskLocked);
                    } else {
                        resolve(accounts[0]);
                    }
                    //SSL
                })
            } else {
                ethereum.request({
                        method: 'eth_accounts'
                    })
                    .then(accounts => {
                        console.log(accounts);
                        if (!accounts.length) {
                            reject(errorCodes.metamaskLocked);
                        } else {
                            resolve(accounts[0]);
                        }
                        //SSL
                    })
            }
        })
    }


    //Отправляет в метамаск транзакцию
    this.sendTx = function (transaction, callback) {
        let thisObject = this;
        return new Promise(function (resolve, reject) {
            //достаем аккаунт
            thisObject.decrypt()
                .then(account => {
                    if (transaction.from.toLowerCase() != account.toLowerCase()) {
                        reject(errorCodes.metamaskWrongAccount);
                    } else {
                        let network = ethereum.networkVersion;
                        if (transaction.chainId != network) {
                            reject(errorCodes.metamaskWrongNetwork);
                        } else {
                            // old version
                            if (_checkWeb3()) {
                                window.web3.eth.sendTransaction(_setGasLimit(transaction), function (err, txHash) {
                                    if (err) {
                                        reject(_processError(err));
                                    } else {
                                        resolve(txHash);
                                    }
                                })
                            } else {
                                try {
                                    window.ethereum.request({
                                            method: 'eth_sendTransaction',
                                            params: [
                                                transaction
                                            ],
                                        })
                                        .then(txHash => {
                                            resolve(txHash);
                                        })
                                        .catch(err => {
                                            reject(_processError(err));
                                        })
                                } catch (err) {
                                    reject(_processError(err));
                                }
                            }
                        }
                    }
                })
                .catch(error => {
                    reject(error);
                })
        })
    }

}

export default new Metamask();