import { wait } from 'dom-testing-library'
import MockEcho from 'mock-echo'
import { mountWithEvent, mountAndReturnEmittedEvent } from './utils'

test('receive event from global fire', async () => {
    var payload
    mountWithEvent('<div></div>', ['foo'], i => payload = i)

    window.livewire.emit('foo', 'bar');

    await wait(() => {
        expect(payload.actionQueue[0].type).toEqual('fireEvent')
        expect(payload.actionQueue[0].payload.event).toEqual('foo')
        expect(payload.actionQueue[0].payload.params).toEqual(['bar'])
    })
})

test('receive event from action fire', async () => {
    var payload
    mountWithEvent('<button wire:click="$emit(\'foo\', \'bar\')"></button>', ['foo'], i => payload = i)

    document.querySelector('button').click()

    await wait(() => {
        expect(payload.actionQueue[0].type).toEqual('fireEvent')
        expect(payload.actionQueue[0].payload.event).toEqual('foo')
        expect(payload.actionQueue[0].payload.params).toEqual(['bar'])
    })
})

test('receive event from component fire, and make sure global listener receives event too', async () => {
    var returnedParamFromOuterListener
    var returnedParamFromInnerListener
    var returnedParamFromGlobalListener
    mountAndReturnEmittedEvent(`
            <div>
                <button id="outer-button" wire:click="$refresh"></button>
                <div wire:id="456" wire:data="{}" wire:events="[]"></div>
            </div>
        `, {
        event: 'foo', params: ['bar'],
    })

    const outerComponent = window.livewire.components.findComponent(123)
    const innerComponent = window.livewire.components.findComponent(456)

    outerComponent.on('foo', (shouldBeBar) => {
        returnedParamFromOuterListener = shouldBeBar
    });

    innerComponent.on('foo', (shouldNotGetCalled) => {
        returnedParamFromInnerListener = shouldNotGetCalled
    });

    window.livewire.on('foo', (shouldBeBar) => {
        returnedParamFromGlobalListener = shouldBeBar
    });

    document.querySelector('#outer-button').click()

    await wait(() => {
        expect(returnedParamFromOuterListener).toEqual('bar')
        expect(returnedParamFromGlobalListener).toEqual('bar')
        expect(returnedParamFromInnerListener).toEqual(undefined)
    })
})

describe('test Laravel Echo', () => {
    let mockEcho

    beforeEach(() => {
        mockEcho = new MockEcho()
        global.Echo = mockEcho
    })

    afterEach(() => {
        delete global.Echo
    })

    test('public echo channel is created and reacts', async () => {
        expect(mockEcho.channelExist('foo')).toBe(false)

        var payload
        mountWithEvent('<div></div>', ['echo:foo,bar'], i => payload = i)

        expect(mockEcho.channelExist('foo')).toBe(true)
        expect(mockEcho.getChannel('foo').eventExist('bar')).toBe(true)

        mockEcho.getChannel('foo').broadcast('bar', 'baz')

        await wait(() => {
            expect(payload.actionQueue[0].type).toEqual('fireEvent')
            expect(payload.actionQueue[0].payload.event).toEqual('echo:foo,bar')
            expect(payload.actionQueue[0].payload.params).toEqual(['baz'])
        })
    })

    test('private echo channel is created and reacts', async () => {
        expect(mockEcho.privateChannelExist('foo')).toBe(false)

        var payload
        mountWithEvent('<div></div>', ['echo-private:foo,bar'], i => payload = i)

        expect(mockEcho.privateChannelExist('foo')).toBe(true)
        expect(mockEcho.getPrivateChannel('foo').eventExist('bar')).toBe(true)

        mockEcho.getPrivateChannel('foo').broadcast('bar', 'baz')

        await wait(() => {
            expect(payload.actionQueue[0].type).toEqual('fireEvent')
            expect(payload.actionQueue[0].payload.event).toEqual('echo-private:foo,bar')
            expect(payload.actionQueue[0].payload.params).toEqual(['baz'])
        })
    })


    test('presence echo channel is created and reacts', async () => {
        expect(mockEcho.presenceChannelExist('foo')).toBe(false)

        var payload
        mountWithEvent('<div></div>', ['echo-presence:foo,here'], i => payload = i)

        expect(mockEcho.presenceChannelExist('foo')).toBe(true)

        mockEcho.getPresenceChannel('foo').iJoin({id: 1, name: 'Caleb'})

        await wait(() => {
            expect(payload.actionQueue[0].type).toEqual('fireEvent')
            expect(payload.actionQueue[0].payload.event).toEqual('echo-presence:foo,here')
            expect(payload.actionQueue[0].payload.params).toEqual([[{id: 1, name: 'Caleb'}]])
        })
    })

    test('notification echo channel is created', async () => {
        expect(mockEcho.privateChannelExist('foo')).toBe(false)

        var payload
        mountWithEvent('<div></div>', ['echo-notification:foo'], i => payload = i)

        expect(mockEcho.privateChannelExist('foo')).toBe(true)
    })
})
