package com.example.IOT.Config;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneId;

import com.example.IOT.Entity.DataSensor;
import com.example.IOT.Entity.ActionHistory;
import com.example.IOT.Repository.DataSensorRepository;
import com.example.IOT.Repository.ActionHistoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
public class MqttConfig {

    // Broker IP + port
    private final String brokerUrl = "tcp://192.168.2.7:1883";
    private final String mqttUser = "anh";
    private final String mqttPassword = "123";

    // Client ID
    private final String clientIdSubDatasensor = "backendSubscriberDatasensor";
    private final String clientIdSubStatus = "backendSubscriberStatus";
    private final String clientIdPubControl = "backendPublisher";

    // MQTT Factory với username/password
    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();

        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setUserName(mqttUser);
        options.setPassword(mqttPassword.toCharArray());
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        factory.setConnectionOptions(options);
        return factory;
    }

    // Channels
    @Bean
    public MessageChannel datasensorChannel() { return new DirectChannel(); }

    @Bean
    public MessageChannel statusChannel() { return new DirectChannel(); }

    @Bean
    public MessageChannel controlChannel() { return new DirectChannel(); }

    // Publisher cho control
    @Bean
    @ServiceActivator(inputChannel = "controlChannel")
    public MessageHandler mqttOutbound() {
        MqttPahoMessageHandler handler =
                new MqttPahoMessageHandler(clientIdPubControl, mqttClientFactory());
        handler.setAsync(true);
        return handler;
    }

    // Subscriber cho datasensor
    @Bean
    public MqttPahoMessageDrivenChannelAdapter datasensorAdapter() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(clientIdSubDatasensor,
                        mqttClientFactory(), "esp8266/datasensor");
        adapter.setOutputChannel(datasensorChannel());
        adapter.setQos(1);
        return adapter;
    }

    // Subscriber cho status
    @Bean
    public MqttPahoMessageDrivenChannelAdapter statusAdapter() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(clientIdSubStatus,
                        mqttClientFactory(), "esp8266/status");
        adapter.setOutputChannel(statusChannel());
        adapter.setQos(1);
        return adapter;
    }

    // Xử lý message datasensor -> parse JSON -> lưu DB
    // Handler cho datasensor
    @Bean
    @ServiceActivator(inputChannel = "datasensorChannel")
    public MessageHandler datasensorHandler(DataSensorRepository dataSensorRepository, ObjectMapper mapper) {
        return message -> {
            try {
                JsonNode node = mapper.readTree(message.getPayload().toString());

                long ts = node.get("time").asLong(); // 👈 đổi sang "time"
                LocalDateTime time = Instant.ofEpochMilli(ts)
                        .atZone(ZoneId.of("UTC"))
                        .toLocalDateTime()
                        .withNano(0);

                DataSensor sensor = new DataSensor();
                sensor.setTime(time);
                sensor.setTemperature(node.get("temperature").asDouble());
                sensor.setHumidity(node.get("humidity").asDouble());
                sensor.setLight(node.get("light").asInt());

                dataSensorRepository.save(sensor);
                System.out.println("✅ Saved datasensor: " + sensor);
            } catch (Exception e) {
                e.printStackTrace();
            }
        };
    }

    // Handler cho status
    @Bean
    @ServiceActivator(inputChannel = "statusChannel")
    public MessageHandler statusHandler(ActionHistoryRepository actionHistoryRepository, ObjectMapper mapper) {
        return message -> {
            try {
                JsonNode node = mapper.readTree(message.getPayload().toString());

                long ts = node.get("time").asLong(); // 👈 đổi sang "time"
                LocalDateTime time = Instant.ofEpochMilli(ts)
                        .atZone(ZoneId.of("UTC"))
                        .toLocalDateTime().withNano(0);

                ActionHistory history = new ActionHistory();
                history.setTime(time);
                history.setDevice(node.get("device").asText());
                history.setStatus(node.get("status").asText());

                actionHistoryRepository.save(history);
                System.out.println("✅ Saved action history: " + history);
            } catch (Exception e) {
                e.printStackTrace();
            }
        };
    }
}
