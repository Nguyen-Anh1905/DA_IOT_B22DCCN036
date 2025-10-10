package com.example.IOT.Repository;

import com.example.IOT.Entity.ActionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ActionHistoryRepository extends JpaRepository<ActionHistory, Long> {
    List<ActionHistory> findTop1ByOrderByTimeDesc();


    // Search id
    @Query("SELECT a FROM ActionHistory a " +
            "WHERE (:device = 'all' OR a.device = :device) " +
            "AND (:status = 'all' OR a.status = :status) " +
            "AND a.id = :id")
    Page<ActionHistory> search(
            @Param("device") String device,
            @Param("status") String status,
            @Param("id") Long id,
            Pageable pageable);

    // search time
    @Query("SELECT a FROM ActionHistory a " +
            "WHERE (:device = 'all' OR a.device = :device) " +
            "AND (:status = 'all' OR a.status = :status) " +
            "AND (:keyword IS NULL OR CAST(a.time AS string) LIKE %:keyword%)")
    Page<ActionHistory> search(
            @Param("device") String device,
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
