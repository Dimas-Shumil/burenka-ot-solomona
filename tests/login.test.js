import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLogin,isValidLogin} from '../src/lib/login.js';
test('Создание OWNER принимает почту и прежние логины, отклоняет ошибочный ввод',()=>{
 for(const value of ['andrei','owner.name','owner-name','owner_name','owner.name1001@mail.ru','owner+business@example.com'])assert.equal(isValidLogin(normalizeLogin(value)),true,value);
 assert.equal(normalizeLogin('  Owner.Name@MAIL.RU  '),'owner.name@mail.ru');
 for(const value of ['','ab','owner@','owner@@example.com','a b@example.com','x'.repeat(255)])assert.equal(isValidLogin(normalizeLogin(value)),false,value);
});
